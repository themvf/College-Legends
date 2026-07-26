import type { BalanceConfiguration, CareerPath } from "@college-legends/model";

const FICTIONAL_FIRST_NAMES = [
  "Aaron", "Adrian", "Andre", "Anthony", "Brandon", "Bryce", "Caleb", "Cameron",
  "Carlos", "Cedric", "Chris", "Darius", "Darren", "David", "DeAndre", "Devin",
  "Dominic", "Donovan", "Drew", "Elijah", "Ethan", "Evan", "Gabriel", "Isaiah",
  "Jalen", "Jamal", "James", "Jared", "Jason", "Jayden", "Jeremiah", "Jordan",
  "Jose", "Joshua", "Julian", "Justin", "Kai", "Keon", "Khalil", "Landon",
  "Logan", "Malachi", "Malcolm", "Marcus", "Mario", "Mason", "Mateo", "Micah",
  "Miles", "Nate", "Nathan", "Nicholas", "Noah", "Owen", "Patrick", "Quentin",
  "Rashad", "Raymond", "Roman", "Ryan", "Sam", "Sean", "Seth", "Shane",
  "Terrence", "Theo", "Thomas", "Travis", "Trevor", "Tristan", "Tyler", "Victor",
  "Wesley", "Xavier", "Zachary", "Zion", "Aiden", "Amari", "Blake", "Cole",
  "Damian", "Desmond", "Emmanuel", "Grayson", "Ian", "Jacoby", "Kendrick", "Lamar",
  "Marcellus", "Nico", "Preston", "Rafael", "Sterling", "Tariq", "Vincent", "Zaire"
] as const;

const FICTIONAL_LAST_NAMES = [
  "Adams", "Alexander", "Allen", "Anderson", "Armstrong", "Atkins", "Baker", "Banks",
  "Barrett", "Bennett", "Bishop", "Black", "Bradley", "Brooks", "Brown", "Bryant",
  "Butler", "Campbell", "Carter", "Castillo", "Chambers", "Clark", "Coleman", "Collins",
  "Cook", "Cooper", "Crawford", "Cruz", "Daniels", "Davis", "Dawson", "Diaz",
  "Dixon", "Douglas", "Edwards", "Ellis", "Evans", "Fields", "Fisher", "Flores",
  "Foster", "Franklin", "Garcia", "Gardner", "Gibson", "Gonzalez", "Gordon", "Graham",
  "Grant", "Gray", "Green", "Griffin", "Hall", "Hamilton", "Harris", "Harrison",
  "Hayes", "Henderson", "Henry", "Hernandez", "Hill", "Holland", "Holmes", "Howard",
  "Hudson", "Hughes", "Jackson", "James", "Jefferson", "Jenkins", "Johnson", "Jones",
  "Jordan", "Kennedy", "King", "Knight", "Lawson", "Lee", "Lewis", "Long",
  "Lopez", "Marshall", "Martin", "Martinez", "Mason", "Matthews", "McCoy", "Miller",
  "Mitchell", "Moore", "Morales", "Morgan", "Morris", "Murphy", "Nelson", "Nguyen",
  "Ortiz", "Owens", "Parker", "Patterson", "Payne", "Perry", "Peterson", "Phillips",
  "Porter", "Powell", "Price", "Ramirez", "Reed", "Reyes", "Richardson", "Rivera",
  "Roberts", "Robinson", "Rodriguez", "Rogers", "Ross", "Russell", "Sanchez", "Sanders",
  "Scott", "Simmons", "Smith", "Stewart", "Taylor", "Thomas", "Thompson", "Torres",
  "Turner", "Walker", "Ward", "Washington", "Watkins", "Watson", "White", "Williams",
  "Wilson", "Wood", "Wright", "Young", "Alvarez", "Baxter", "Booker", "Caldwell",
  "Cannon", "Delgado", "Espinoza", "Goodwin", "Hardy", "Hines", "Jeffries", "Mendez",
  "Mercer", "Montgomery", "Nash", "Newman", "Pope", "Santiago", "Vaughn", "Webb"
] as const;

/**
 * Produces stable fictional identities without consuming sequential randomness.
 * Ordinals are collision-free until every first/last-name combination is used.
 */
export function fictionalPersonName(ordinal: number, firstOffset = 0, lastOffset = 0): string {
  const safeOrdinal = Math.max(0, Math.trunc(ordinal));
  const firstIndex = (safeOrdinal + Math.trunc(firstOffset)) % FICTIONAL_FIRST_NAMES.length;
  const lastCycle = Math.floor(safeOrdinal / FICTIONAL_FIRST_NAMES.length);
  const lastIndex = (lastCycle + firstIndex * 37 + Math.trunc(lastOffset)) % FICTIONAL_LAST_NAMES.length;
  return `${FICTIONAL_FIRST_NAMES[firstIndex]} ${FICTIONAL_LAST_NAMES[lastIndex]}`;
}

export const DEFAULT_BALANCE: BalanceConfiguration = {
  version: "0.1.0",
  weeklyDevelopment: { base: 0.012, coachWeight: 0.018, workEthicWeight: 0.022, fatigueFloor: 0.62, maximum: 0.09 },
  game: { possessions: 24, homeFieldAdvantage: 1.8, upsetNoise: 11 }
};

export const CAREER_PATHS: Record<CareerPath, { label: string; tier: "LOW" | "MID" | "POWER"; budget: number; initialSecurity: number; championshipDeadline: number | null }> = {
  DYNASTY_BUILDER: { label: "Dynasty Builder", tier: "LOW", budget: 1_500_000, initialSecurity: 92, championshipDeadline: null },
  PROGRAM_RISER: { label: "Program Riser", tier: "MID", budget: 6_000_000, initialSecurity: 65, championshipDeadline: null },
  CHAMPIONSHIP_MANDATE: { label: "Championship Mandate", tier: "POWER", budget: 20_000_000, initialSecurity: 40, championshipDeadline: 2 }
};
