import { db } from "@/prisma/db";
import { MatchType, TournamentFormat } from "@/types/enum";
import _ from "lodash";

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

export class TournamentService {
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
}
