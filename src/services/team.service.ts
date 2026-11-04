import { db } from "@/prisma/db";

export class TeamService {
    static async createMockTeam(
        tournamentId: string,
        teamCount: number,
        rosterSize: number,
    ) {
        const timestamp = Date.now();

        const ADJECTIVES = [
            "Apex",
            "Cyber",
            "Phantom",
            "Vortex",
            "Crimson",
            "Shadow",
            "Omega",
            "Immortal",
        ];
        const NOUNS = [
            "Dragons",
            "Knights",
            "Titans",
            "Ninjas",
            "Spirits",
            "Vipers",
            "Phoenix",
            "Lords",
        ];

        function generateTeamName(index: number): string {
            const adj =
                ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
            const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
            return `${adj} ${noun} #${index + 1}`;
        }

        return await db.transaction(async (tx) => {
            for (let i = 0; i < teamCount; i++) {
                const teamName = generateTeamName(i);

                const team = await tx.orm.public.Team.create({
                    tournamentId,
                    name: teamName,
                    status: "APPROVED",
                    tag: `MOCK${i + 1}`,
                });

                // Tạo Roster Players cho Team
                const playersData = Array.from(
                    { length: rosterSize },
                    (_, pIdx) => ({
                        teamId: team.id,
                        discordId: `MOCK_${timestamp}_${i + 1}_${pIdx + 1}`, // Discord ID ảo đánh dấu rõ ràng
                        ign: `Player_${i + 1}_${pIdx + 1}`,
                        isCaptain: pIdx === 0, // Tuyển thủ đầu tiên làm Đội trưởng
                    }),
                );

                const created =
                    await tx.orm.public.Player.createAll(playersData);
                return created.length;
            }
        });
    }

    
}
