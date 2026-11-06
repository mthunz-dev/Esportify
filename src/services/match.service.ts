import { AiService, type analyzedMatchResult } from "./ai.service";
import { db } from "@/prisma/db";
import { getGameConfig } from "@/modules/games";
import { and } from "@prisma/orm-postgres/orm-client";
import type { Models } from "@/prisma/contract";
import { parseDurationToSeconds } from "@/utils/common";
import _ from "lodash";
import type { GameConfig } from "@/modules/games/GameConfig";
import ms from "ms";
import { createCanvas, loadImage } from "canvas";
import path from "path";

export type ActiveMatchWithRoster = Models.public_Match & {
    teamA: Models.public_Team & { players: Models.public_Player[] };
    teamB: Models.public_Team & { players: Models.public_Player[] };
    rounds: Models.public_Round[];
};

interface RoundData {
    screenshotUrl: string;
    teamAPoint: number;
    teamBPoint: number;
    winnerId: string;
    mvp: Models.public_Player;
    duration?: number;
}

export class MatchService {
    static async previewResult(
        tournamentId: string,
        gameId: string,
        imageUrl: string,
        callback?: any,
    ) {
        const gameConfig = getGameConfig(gameId);

        if (!gameConfig)
            throw new Error(
                `Game \`${gameId}\` của giải đấu không tồn tại, vui lòng kiểm tra lại hệ thống !`,
            );

        const activeMatches = await db.orm.public.Match.where({ tournamentId })
            .where((m) =>
                and(
                    m.status.in(["PENDING", "ONGOING"]),
                    m.teamAId.isNotNull(),
                    m.teamBId.isNotNull(),
                ),
            )

            .include("teamA", (t) => t.include("players"))
            .include("teamB", (t) => t.include("players"))
            .include("rounds")
            .all();

        if (activeMatches.length === 0)
            throw new Error(
                "Không có trận đấu nào đang chờ kết quả trong giải này.",
            );

        const ingames = activeMatches.flatMap((m) => [
            ...m.teamA!.players.map((p) => p.ign),
            ...m.teamB!.players.map((p) => p.ign),
        ]);

        const analyzedData = await AiService.analyzeMatchImage(
            imageUrl,
            gameConfig,
            ingames,
        );

        if (!analyzedData)
            throw new Error(
                "Không thể phân tích kết quả trận đấu. Vui lòng thử lại với hình ảnh rõ nét hơn!",
            );

        const { matchedMatch, roundData } = this.matchIgnToDatabase(
            activeMatches as ActiveMatchWithRoster[],
            analyzedData,
            imageUrl,
        );

        if (matchedMatch.rounds.length >= matchedMatch.bestOf) {
            throw new Error(
                `Trận đấu này đã ghi nhận đủ tối đa số lượng ván đấu (BO${matchedMatch.bestOf}).`,
            );
        }

        return {
            match: matchedMatch,
            roundData: roundData,
        };
    }

    private static matchIgnToDatabase(
        activeMatches: ActiveMatchWithRoster[],
        aiResult: analyzedMatchResult,
        screenshotUrl: string,
    ) {
        const aiWinnerIgns = aiResult.winner.igns.map((ign: string) =>
            ign.toLowerCase(),
        );
        const aiLoserIgns = aiResult.loser.igns.map((ign: string) =>
            ign.toLowerCase(),
        );

        for (const match of activeMatches) {
            const teamAIgns = match.teamA.players.map((p: any) =>
                p.ign.toLowerCase(),
            );
            const teamBIgns = match.teamB.players.map((p: any) =>
                p.ign.toLowerCase(),
            );

            // Đếm số lượng IGN trùng khớp
            const winnerMatchesTeamA = aiWinnerIgns.filter((ign) =>
                teamAIgns.includes(ign),
            ).length;
            const loserMatchesTeamB = aiLoserIgns.filter((ign) =>
                teamBIgns.includes(ign),
            ).length;

            const winnerMatchesTeamB = aiWinnerIgns.filter((ign) =>
                teamBIgns.includes(ign),
            ).length;
            const loserMatchesTeamA = aiLoserIgns.filter((ign) =>
                teamAIgns.includes(ign),
            ).length;

            const mvp = [...match.teamA.players, ...match.teamB.players].find(
                (p) => p.ign === aiResult.mvp,
            );
            const durationInSeconds = parseDurationToSeconds(aiResult.duration);

            //teamA win
            if (winnerMatchesTeamA >= 2 && loserMatchesTeamB >= 2) {
                return {
                    matchedMatch: match,
                    roundData: {
                        teamAPoint: aiResult.winner.score,
                        teamBPoint: aiResult.loser.score,
                        winnerId: match.teamA.id,
                        mvp,
                        duration: durationInSeconds,
                        screenshotUrl,
                    } as RoundData,
                };
            }
            // teamB win
            else if (winnerMatchesTeamB >= 2 && loserMatchesTeamA >= 2) {
                return {
                    matchedMatch: match,
                    roundData: {
                        teamAPoint: aiResult.loser.score,
                        teamBPoint: aiResult.winner.score,
                        winnerId: match.teamB.id,
                        mvp,
                        duration: durationInSeconds,
                        screenshotUrl,
                    } as RoundData,
                };
            }
        }

        throw new Error(
            "Nhận diện thành công bảng điểm nhưng các tuyển thủ trong ảnh không khớp với bất kỳ trận đấu nào đang chờ kết quả!",
        );
    }
    static async submitRound(matchId: string, roundData: RoundData) {
        return await db.transaction(async (tx) => {
            const match = await tx.orm.public.Match.where({ id: matchId })
                .include("rounds")
                .first();

            if (!match) throw new Error("Không tìm thấy trận đấu.");

            await tx.orm.public.Round.create({
                matchId: match.id,
                roundIndex: match.rounds.length + 1,
                mvpId: roundData.mvp.id,
                ..._.omit(roundData, ["mvp"]),
            });

            let matchScoreA = match.teamAScore || 0;
            let matchScoreB = match.teamBScore || 0;

            if (roundData.winnerId === match.teamAId) matchScoreA += 1;
            else if (roundData.winnerId === match.teamBId) matchScoreB += 1;

            const winThreshold = Math.ceil(match.bestOf / 2);
            const isMatchFinished =
                matchScoreA >= winThreshold || matchScoreB >= winThreshold;

            const newStatus = isMatchFinished ? "COMPLETED" : "ONGOING";

            // 4. Update thông số trận đấu
            let updatedMatch = await tx.orm.public.Match.where({
                id: match.id,
            }).update({
                teamAScore: matchScoreA,
                teamBScore: matchScoreB,
                status: newStatus,
            });

            // 5. LUỒNG TỰ ĐỘNG CHUYỂN TIẾP (Advance Knockout)
            // Nếu trận kết thúc và có chỉ định nextMatchId, đẩy đội thắng sang trận tiếp theo

            if (isMatchFinished) {
                const finalWinnerId = isMatchFinished
                    ? matchScoreA >= winThreshold
                        ? match.teamAId
                        : match.teamBId
                    : null;

                if (!match.nextMatchId) {
                    updatedMatch = await tx.orm.public.Match.where({
                        id: match.id,
                    }).update({ winnerId: finalWinnerId });

                    const winnerTeam = await tx.orm.public.Team.first({
                        id: finalWinnerId,
                    });
                    if (winnerTeam)
                        await tx.orm.public.Team.where({
                            id: finalWinnerId,
                        }).update({ groupPoints: winnerTeam.groupPoints + 3 });
                } else {
                    const nextMatch = await tx.orm.public.Match.first({
                        id: match.nextMatchId,
                    });
                    if (nextMatch) {
                        // Nếu nhánh của đội A trống thì chui vào A, nếu có A rồi thì chui vào B
                        const updateData = nextMatch.teamAId
                            ? { teamBId: finalWinnerId }
                            : { teamAId: finalWinnerId };
                        updatedMatch = await tx.orm.public.Match.where({
                            id: nextMatch.id,
                        }).update(updateData);
                    }
                }
            }

            return { updatedMatch, isMatchFinished };
        });
    }

    static generateMock(
        match: Omit<ActiveMatchWithRoster, "rounds">,
        gameConfig: GameConfig,
    ) {
        const teamAPlayers = _.sampleSize(
            match.teamA.players,
            gameConfig.minPlayers,
        );
        const teamBPlayers = _.sampleSize(
            match.teamB.players,
            gameConfig.minPlayers,
        );

        const isTeamAWin = Math.random() > 0.5;

        const { mock } = gameConfig;

        const scoreA = isTeamAWin
            ? mock.score.max
            : _.random(mock.score.min, mock.score.max - 2);
        const scoreB = isTeamAWin
            ? _.random(3, mock.score.max - 2)
            : mock.score.max;

        const generateStats = () => ({
            k: _.random(mock.k.min, mock.k.max),
            d: _.random(mock.d.min, mock.d.max),
            a: _.random(mock.a.min, mock.a.max),
            isMvp: false,
        });

        const side1 = teamAPlayers.map((p) => ({
            ign: p.ign,
            ...generateStats(),
        }));
        const side2 = teamBPlayers.map((p) => ({
            ign: p.ign,
            ...generateStats(),
        }));

        const mvpIndex = _.random(0, gameConfig.minPlayers - 1);
        const [winnerSide, loserSide] = isTeamAWin
            ? [side1, side2]
            : [side2, side1];
        winnerSide[mvpIndex].isMvp = true;

        return {
            teamAScore: scoreA,
            teamBScore: scoreB,
            winnerId: isTeamAWin ? match.teamAId : match.teamBId,
            winnerSide,
            duration: _.random(ms("20m"), ms("30m")),
            loserSide,
        };
    }
    static async renderMockImage(
        mockData: ReturnType<typeof this.generateMock>,
    ) {
        const templatePath = path.join(
            __dirname,
            "../../assets/valorant-template.jpg",
        );
        const image = await loadImage(templatePath);

        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d");

        ctx.drawImage(image, 0, 0);

        ctx.fillStyle = "#ffffff";

        // 1. Vẽ Tỷ số
        ctx.font = "bold 80px Arial";
        // Đội thắng
        ctx.fillText(
            mockData.teamAScore > mockData.teamBScore
                ? mockData.teamAScore.toString()
                : mockData.teamBScore.toString(),
            730,
            150,
        );
        // Đội thua
        ctx.fillText(
            mockData.teamAScore > mockData.teamBScore
                ? mockData.teamBScore.toString()
                : mockData.teamAScore.toString(),
            1150,
            150,
        );

        ctx.font = "bold 70px Arial";
        ctx.fillText("VICTORY", 840, 150);

        // 2. Vẽ Thời gian thi đấu (Chuyển ms sang format mm:ss nếu cần)
        ctx.font = "15px Arial";
        const minutes = Math.floor(mockData.duration / 60000);
        const seconds = ((mockData.duration % 60000) / 1000).toFixed(0);
        const durationStr =
            `${minutes}`.padStart(2, "0") + ":" + `${seconds}`.padStart(2, "0");
        ctx.fillText(`${durationStr}`, 135, 165);

        // 3. Vẽ Thông tin người chơi
        ctx.font = "18px Arial";

        mockData.winnerSide.sort((a, b) => {
            if (a.isMvp) return -1;
            if (b.isMvp) return 1;
            return b.k - a.k;
        });

        // Cấu trúc hàng theo màu trong template: 0:Xanh, 1:Xanh, 2:Đỏ, 3:Xanh, 4:Xanh, 5:Đỏ, 6:Xanh, 7:Đỏ, 8:Xanh, 9:Đỏ
        const rowColors = [
            "green",
            "green",
            "red",
            "green",
            "green",
            "red",
            "red",
            "red",
            "green",
            "red",
        ];
        let winnerIndex = 0;
        let loserIndex = 0;

        const startY = 340;
        const rowHeight = 55;

        for (let i = 0; i < 10; i++) {
            const y = startY + i * rowHeight;
            let player;

            if (
                rowColors[i] === "green" &&
                winnerIndex < mockData.winnerSide.length
            ) {
                player = mockData.winnerSide[winnerIndex];
                winnerIndex++;
            } else if (
                rowColors[i] === "red" &&
                loserIndex < mockData.loserSide.length
            ) {
                player = mockData.loserSide[loserIndex];
                loserIndex++;
            } else {
                console.log(i);
                continue; // Nếu thiếu người thì bỏ qua hàng
            }

            if (player) {
                // Vẽ IGN
                ctx.fillText(player.ign, 340, y);
                // Vẽ KDA
                ctx.fillText(`${player.k} / ${player.d} / ${player.a}`, 860, y);
            }
        }

        return canvas.toBuffer("image/png");
    }
    static async calculateGroupStandings(tournamentId: string) {
        // 1. Kéo toàn bộ trận đấu thuộc Vòng bảng (GROUP_STAGE)
        const groupMatches = await db.orm.public.Match.where({
            tournamentId: tournamentId,
            type: "GROUP_MATCH",
        })
            .include("teamA")
            .include("teamB")
            .all();

        if (groupMatches.length === 0) return [];

        // 2. Dùng Map để gom nhóm dữ liệu
        // Cấu trúc: Map<Tên Bảng, Map<Id Đội, Dữ liệu Đội>>
        const groupsMap = new Map<string, Map<string, any>>();

        for (const match of groupMatches) {
            const groupName = match.name; // Tên bảng (Ví dụ: "Bảng A")

            if (!groupsMap.has(groupName)) {
                groupsMap.set(groupName, new Map());
            }

            const teamStatsMap = groupsMap.get(groupName)!;

            // Khởi tạo chỉ số cho Đội A nếu chưa có
            if (match.teamA && !teamStatsMap.has(match.teamA.id)) {
                teamStatsMap.set(match.teamA.id, {
                    id: match.teamA.id,
                    name: match.teamA.name,
                    w: 0,
                    l: 0,
                    pts: 0,
                });
            }

            // Khởi tạo chỉ số cho Đội B nếu chưa có
            if (match.teamB && !teamStatsMap.has(match.teamB.id)) {
                teamStatsMap.set(match.teamB.id, {
                    id: match.teamB.id,
                    name: match.teamB.name,
                    w: 0,
                    l: 0,
                    pts: 0,
                });
            }

            // 3. Nếu trận đấu ĐÃ KẾT THÚC, bắt đầu cộng điểm
            if (match.status === "COMPLETED" && match.teamA && match.teamB) {
                const teamAStats = teamStatsMap.get(match.teamA.id);
                const teamBStats = teamStatsMap.get(match.teamB.id);

                const scoreA = match.teamAScore || 0;
                const scoreB = match.teamBScore || 0;

                if (scoreA > scoreB) {
                    teamAStats.w += 1;
                    teamAStats.pts += 3; // Thắng cộng 3 điểm (Có thể sửa thành 1 tùy luật giải)

                    teamBStats.l += 1;
                } else if (scoreB > scoreA) {
                    teamBStats.w += 1;
                    teamBStats.pts += 3;

                    teamAStats.l += 1;
                }
            }
        }

        // 4. Chuyển đổi Map thành Mảng (Array) để Canvas dễ lặp qua và vẽ
        const groupsData = Array.from(groupsMap.entries()).map(
            ([groupName, teamsMap]) => {
                // Sắp xếp các đội trong bảng theo Điểm (Pts) giảm dần
                const sortedTeams = Array.from(teamsMap.values()).sort(
                    (a, b) => b.pts - a.pts,
                );

                return {
                    name: groupName,
                    teams: sortedTeams,
                };
            },
        );

        // 5. Sắp xếp mảng các Bảng theo tên (Bảng A -> Bảng B -> Bảng C)
        groupsData.sort((a, b) => a.name.localeCompare(b.name));

        return groupsData; // Trả về format chuẩn xác cho hàm vẽ Canvas
    }
}
