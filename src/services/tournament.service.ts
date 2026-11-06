import { db } from "@/prisma/db";
import { MatchType, TournamentFormat } from "@/types/enum";
import { CanvasRenderingContext2D, createCanvas } from "canvas";
import _ from "lodash";
import { and } from "@prisma/orm-postgres/orm-client";

interface TournamentCreateOptions {
    guildId: string;
    name: string;
    gameId: string;
    teamCount: number;
    format: TournamentFormat;
    groupOption?: {
        groupCount: number;
        advancePerGroup: number;
    };
}

interface TeamStats {
    id: string;
    name: string;
    w: number;
    l: number;
    pts: number;
}

export interface MatchDisplayStats {
    teamA: {
        name: string;
        tag: string | null;
    } | null;
    teamB: {
        name: string;
        tag: string | null;
    } | null;
    teamAScore: number | null;
    teamBScore: number | null;
    status: "PENDING" | "ONGOING" | "COMPLETED"; // Tuỳ chỉnh theo Enum của database
}

export class TournamentService {
    private static truncateText(
        ctx: CanvasRenderingContext2D,
        text: string,
        maxWidth: number,
    ): string {
        const width = ctx.measureText(text).width;
        if (width <= maxWidth) return text;
        let truncated = text;
        while (
            ctx.measureText(truncated + "...").width > maxWidth &&
            truncated.length > 0
        ) {
            truncated = truncated.slice(0, -1);
        }
        return truncated + "...";
    }

    static async createWithFormat(
        options: TournamentCreateOptions,
        callback?: any,
    ) {
        try {
            return await db.transaction(async (tx) => {
                let createdMatches = 0;
                const tournament = await tx.orm.public.Tournament.create({
                    guildId: options.guildId,
                    name: options.name,
                    game: options.gameId,
                    teamCount: options.teamCount,
                    groupCount: options.groupOption?.groupCount,
                    format: options.format,
                });

                if (
                    options.format === TournamentFormat.GroupStage &&
                    options.groupOption
                ) {
                    const { groupCount } = options.groupOption;
                    const teamsPerGroup = options.teamCount / groupCount;

                    const groupsData = Array.from({ length: groupCount }).map(
                        (_, i) => ({
                            tournamentId: tournament.id,
                            name: `Bảng ${String.fromCharCode(65 + i)}`,
                        }),
                    );

                    const createdGroups =
                        await tx.orm.public.Group.createAll(groupsData);

                    for (const group of createdGroups) {
                        const matchesData = Array.from({
                            length: (teamsPerGroup * (teamsPerGroup - 1)) / 2,
                        }).map((_, i) => ({
                            tournamentId: tournament.id,
                            name: `${group.name} - Trận ${i + 1}`,
                            groupId: group.id,
                            type: MatchType.GroupMatch,
                            bestOf: 1,
                        }));

                        const createdStageMaches =
                            await tx.orm.public.Match.createAll(matchesData);
                        createdMatches += createdStageMaches.length;
                    }
                } else if (
                    options.format === TournamentFormat.SingleElimination
                ) {
                    let currentRoundTeams = 2;
                    let nextRoundMatches: { id: string }[] = [];

                    while (currentRoundTeams <= options.teamCount) {
                        const matchesInThisRound = currentRoundTeams / 2;

                        let roundName = `Vòng 1/${currentRoundTeams}`;
                        let matchType: MatchType = MatchType.KnockoutMatch;
                        let bestOf = 3;

                        if (currentRoundTeams === 2) {
                            roundName = "Chung Kết";
                            matchType = MatchType.Final;
                            bestOf = 5;
                        } else if (currentRoundTeams === 4) {
                            roundName = "Bán Kết";
                        } else if (currentRoundTeams === 8) {
                            roundName = "Tứ Kết";
                        }

                        const matchesData = Array.from({
                            length: matchesInThisRound,
                        }).map((_, i) => {
                            const nextMatchId =
                                nextRoundMatches.length > 0
                                    ? nextRoundMatches[Math.floor(i / 2)].id
                                    : null;

                            return {
                                tournamentId: tournament.id,
                                type: matchType,
                                name: roundName,
                                bestOf: bestOf,
                                nextMatchId: nextMatchId,
                            };
                        });

                        createdMatches += matchesInThisRound;

                        nextRoundMatches =
                            await tx.orm.public.Match.createAll(matchesData);
                        currentRoundTeams *= 2;
                    }
                }
                return createdMatches;
            });
        } catch (error) {
            console.error(
                "[TournamentService Error]: Failed to create new tournament",
                error,
            );
            return 0;
        }
    }

    static async drawMatches(
        tournamentId: string,
        allowBye: boolean = false,
        callback?: any,
    ) {
        const tournament = (await db.orm.public.Tournament.first({
            id: tournamentId,
        }))!;

        return await db.transaction(async (tx) => {
            let updatedMatches = 0;

            const teams = await tx.orm.public.Team.where({
                tournamentId: tournament.id,
                status: "APPROVED",
            }).all();

            if (teams.length < tournament.teamCount && !allowBye) return 0;

            const shuffledTeams = _.shuffle(teams);

            if (tournament.format === TournamentFormat.SingleElimination) {
                let firstRoundName = `Vòng 1/${tournament.teamCount}`;
                if (tournament.teamCount === 2) firstRoundName = "Chung Kết";
                else if (tournament.teamCount === 4) firstRoundName = "Bán Kết";
                else if (tournament.teamCount === 8) firstRoundName = "Tứ Kết";

                const firstRoundMatches = await tx.orm.public.Match.where({
                    tournamentId: tournament.id,
                    name: firstRoundName,
                    status: "PENDING",
                    type: "KNOCKOUT_MATCH",
                }).all();

                for (const match of firstRoundMatches) {
                    const teamA = shuffledTeams.pop();
                    const teamB = shuffledTeams.pop();

                    await tx.orm.public.Match.where({ id: match.id }).update({
                        teamAId: teamA?.id,
                        teamBId: teamB?.id,
                    });

                    updatedMatches++;
                }
            } else if (tournament.format === TournamentFormat.GroupStage) {
                const groups = await tx.orm.public.Group.where({
                    tournamentId: tournament.id,
                }).all();

                const teamsPerGroup =
                    tournament.teamCount / tournament.groupCount;

                const teamChunk = _.chunk(shuffledTeams, teamsPerGroup);

                for (let i = 0; i < groups.length; i++) {
                    const group = groups[i];
                    const groupTeams = teamChunk[i];

                    await tx.orm.public.Team.where((t) =>
                        t.id.in(groupTeams.map((gt) => gt.id)),
                    ).updateAll({ groupId: group.id });

                    const pairs: [string, string][] = [];
                    for (let a = 0; a < groupTeams.length; a++) {
                        for (let b = a + 1; b < groupTeams.length; b++) {
                            pairs.push([groupTeams[a].id, groupTeams[b].id]);
                        }
                    }

                    const groupMatches = await tx.orm.public.Match.where({
                        tournamentId: tournament.id,
                        groupId: group.id,
                        status: "PENDING",
                        type: "GROUP_MATCH",
                    }).all();

                    for (let mIdx = 0; mIdx < groupMatches.length; mIdx++) {
                        const match = groupMatches[mIdx];
                        const [teamAId, teamBId] = pairs[mIdx];

                        await tx.orm.public.Match.where({
                            id: match.id,
                        }).update({ teamAId, teamBId });

                        updatedMatches++;
                    }
                }
            }

            return updatedMatches;
        });
    }

    static async calculateGroupStandings(tournamentId: string) {
        const matches = await db.orm.public.Match.where((m) =>
            and(m.teamAId.isNotNull(), m.teamBId.isNotNull()),
        )
            .where({
                tournamentId,
                type: "GROUP_MATCH",
                status: "COMPLETED",
            })
            .all();

        const groups = await db.orm.public.Group.where({
            tournamentId,
        })
            .include("teams")
            .orderBy((g) => g.name.asc())
            .all();

        return groups.map((g) => {
            const sortedTeams = g.teams
                .map((team) => {
                    const playedMatches = matches.filter(
                        (m) => m.teamAId === team.id || m.teamBId === team.id,
                    );
                    const w = playedMatches.filter(
                        (m) => m.winnerId === team.id,
                    ).length;
                    const l = playedMatches.length - w;

                    const pts = team.groupPoints;

                    return {
                        id: team.id,
                        name: team.name,
                        w,
                        l,
                        pts,
                    } as TeamStats;
                })
                .sort((a, b) => b.pts - a.pts);

            return {
                name: g.name,
                teams: sortedTeams,
            };
        });
    }

    static async generateGroupStandingsImage(
        groupsData: {
            name: string;
            teams: TeamStats[];
        }[],
    ): Promise<Buffer> {
        const canvas = createCanvas(1920, 1080);
        const ctx = canvas.getContext("2d");

        // Nền tối Esports
        ctx.fillStyle = "#121212";
        ctx.fillRect(0, 0, 1920, 1080);

        // Tiêu đề chính
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 50px Arial";
        ctx.textAlign = "center";
        ctx.fillText("BẢNG XẾP HẠNG VÒNG BẢNG", 960, 100);
        ctx.fillStyle = "#00FFCC"; // Line trang trí màu Neon
        ctx.fillRect(860, 125, 200, 4);

        const columns = Math.min(groupsData.length, 4) || 1;
        const cardWidth = 400;
        const cardGap = 40;
        const startX =
            (1920 - (columns * cardWidth + (columns - 1) * cardGap)) / 2;

        groupsData.forEach((group, i) => {
            const col = i % columns;
            const row = Math.floor(i / columns);
            const x = startX + col * (cardWidth + cardGap);
            const y = 200 + row * 420;

            ctx.beginPath();

            // Card Background
            ctx.fillStyle = "#1E1E24";
            ctx.roundRect(x, y, cardWidth, 380, 12);
            ctx.fill();

            // Header Bảng
            ctx.fillStyle = "#00FFCC";
            ctx.font = "bold 26px Arial";
            ctx.textAlign = "left";
            ctx.fillText(group.name.toUpperCase(), x + 20, y + 45);

            // Header Cột (Team, W, L, Pts)
            ctx.fillStyle = "#A0A0A0";
            ctx.font = "bold 18px Arial";
            ctx.fillText("TEAM", x + 20, y + 90);
            ctx.textAlign = "center";
            ctx.fillText("W", x + 250, y + 90);
            ctx.fillText("L", x + 310, y + 90);
            ctx.fillStyle = "#FFFFFF";
            ctx.fillText("PTS", x + 370, y + 90);

            // Line phân cách header (fillRect hoạt động độc lập, không bị dính vào path)
            ctx.fillStyle = "#333333";
            ctx.fillRect(x + 20, y + 105, cardWidth - 40, 2);

            // Vẽ từng đội
            group.teams.forEach((team, tIdx) => {
                const rowY = y + 140 + tIdx * 50;

                ctx.textAlign = "left";
                ctx.fillStyle = "#FFFFFF";
                ctx.font = "bold 20px Arial";
                const teamName = this.truncateText(
                    ctx,
                    `${tIdx + 1}. ${team.name}`,
                    200,
                );
                ctx.fillText(teamName, x + 20, rowY);

                ctx.textAlign = "center";
                ctx.fillStyle = "#A0A0A0";
                ctx.font = "20px Arial";
                ctx.fillText(team.w.toString(), x + 250, rowY);
                ctx.fillText(team.l.toString(), x + 310, rowY);

                ctx.fillStyle = "#00FFCC";
                ctx.font = "bold 22px Arial";
                ctx.fillText(team.pts.toString(), x + 370, rowY);
            });
        });

        return canvas.toBuffer("image/png");
    }

    static async generateGroupMatchesImage(
        matchesData: MatchDisplayStats[],
    ): Promise<Buffer> {
        const canvas = createCanvas(1920, 1080);
        const ctx = canvas.getContext("2d");

        // 1. Vẽ nền
        ctx.fillStyle = "#121212";
        ctx.fillRect(0, 0, 1920, 1080);

        // 2. Vẽ Tiêu đề
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 50px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic"; // Đặt lại baseline chuẩn cho tiêu đề
        ctx.fillText("LỊCH THI ĐẤU & KẾT QUẢ VÒNG BẢNG", 960, 90);

        ctx.fillStyle = "#00FFCC";
        ctx.fillRect(860, 115, 200, 4);

        // 3. Cấu hình Lưới 4x9 (Tối đa 36 trận)
        const maxMatches = 36;
        const matchesToDraw = matchesData.slice(0, maxMatches);

        const columns = 4;
        const cardWidth = 440;
        const cardHeight = 75;
        const gapX = 20; // Khoảng cách giữa các cột
        const gapY = 20; // Khoảng cách giữa các hàng

        // Tính toán tọa độ xuất phát (căn giữa trục X)
        const totalGridWidth = columns * cardWidth + (columns - 1) * gapX;
        const startX = (1920 - totalGridWidth) / 2;
        const startY = 170; // Bắt đầu vẽ từ tọa độ Y = 170 để cách tiêu đề

        matchesToDraw.forEach((match, index) => {
            const col = index % columns;
            const row = Math.floor(index / columns);

            const x = startX + col * (cardWidth + gapX);
            const y = startY + row * (cardHeight + gapY);

            // BẮT BUỘC: Khởi tạo path mới (Tránh lỗi tô nền như phần Bảng Xếp Hạng)
            ctx.beginPath();

            // Vẽ nền Card
            ctx.fillStyle = "#1E1E24";
            ctx.roundRect(x, y, cardWidth, cardHeight, 10);
            ctx.fill();

            // Vẽ viền Card cho tinh tế
            ctx.strokeStyle = "#2A2A35";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Tọa độ trung tâm của Card để căn lề chữ dễ dàng
            const centerX = x + cardWidth / 2;
            const centerY = y + cardHeight / 2;

            // Đặt textBaseline về middle để chữ luôn đứng ở giữa chiều dọc của Card
            ctx.textBaseline = "middle";

            // VẼ TỶ SỐ Ở GIỮA
            ctx.textAlign = "center";
            if (match.status === "COMPLETED") {
                ctx.fillStyle = "#00FFCC"; // Cyan nổi bật
                ctx.font = "bold 24px Arial";
                ctx.fillText(
                    `${match.teamAScore ?? 0} - ${match.teamBScore ?? 0}`,
                    centerX,
                    centerY,
                );
            } else {
                ctx.fillStyle = "#666666"; // Xám chìm cho trận chưa diễn ra
                ctx.font = "bold 18px Arial";
                ctx.fillText("vs", centerX, centerY);
            }

            // VẼ TÊN ĐỘI
            const maxTeamNameWidth = 145; // Tránh chữ dài đâm vào tỷ số ở giữa

            // Team A (Bên trái tỷ số, canh lề phải)
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 18px Arial";
            ctx.textAlign = "right";
            const safeTeamA = this.truncateText(
                ctx,
                match.teamA?.tag || match.teamA?.name || "TBD",
                maxTeamNameWidth,
            );
            ctx.fillText(safeTeamA, centerX - 45, centerY);

            // Team B (Bên phải tỷ số, canh lề trái)
            ctx.textAlign = "left";
            const safeTeamB = this.truncateText(
                ctx,
                match.teamB?.tag || match.teamB?.name || "TBD",
                maxTeamNameWidth,
            );
            ctx.fillText(safeTeamB, centerX + 45, centerY);
        });

        // 4. Xử lý logic Phân Trang (Hiển thị text nếu bị tràn)
        if (matchesData.length > maxMatches) {
            ctx.fillStyle = "#A0A0A0";
            ctx.font = "italic 20px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            const remaining = matchesData.length - maxMatches;
            ctx.fillText(
                `+ ${remaining} trận đấu khác đang chờ... (Vui lòng xem trang tiếp theo)`,
                960,
                1050,
            );
        }

        return canvas.toBuffer("image/png");
    }
}
