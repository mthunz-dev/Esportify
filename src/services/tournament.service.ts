import { db } from "@/prisma/db";
import { MatchType, TournamentFormat } from "@/types/enum";

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
                    format: options.format,
                });

                if (
                    options.format === TournamentFormat.GroupStage &&
                    options.groupOption
                ) {
                    const { groupCount } = options.groupOption;
                    const teamPerGroup = options.teamCount / groupCount;

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
                            length: (teamPerGroup * (teamPerGroup - 1)) / 2,
                        }).map((_, i) => ({
                            tournamentId: tournament.id,
                            name: `${group.name} - Trận ${i + 1}`,
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
}
