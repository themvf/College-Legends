import type { BalanceConfiguration, CareerPath, DivisionId, Program } from "@college-legends/model";

export interface FictionalProgramDefinition {
  name: string;
  nickname: string;
  abbreviation: string;
  city: string;
  state: string;
  stateCode: string;
  divisionId: DivisionId;
  tier: Program["tier"];
}

export const DIVISION_NAMES: Readonly<Record<DivisionId, string>> = {
  ATLANTIC: "Atlantic Division",
  GREAT_LAKES: "Great Lakes Division",
  HEARTLAND: "Heartland Division",
  GULF: "Gulf Division",
  MOUNTAIN: "Mountain Division",
  PACIFIC: "Pacific Division"
};

/**
 * The original College Legends universe. Every state is represented at least
 * once, while larger recruiting regions support multiple programs.
 */
export const FICTIONAL_PROGRAMS: readonly FictionalProgramDefinition[] = [
  { name: "Chesapeake State", nickname: "Bayhawks", abbreviation: "CHS", city: "Annapolis", state: "Maryland", stateCode: "MD", divisionId: "ATLANTIC", tier: "LOW" },
  { name: "Empire City", nickname: "Knights", abbreviation: "ECU", city: "Albany", state: "New York", stateCode: "NY", divisionId: "ATLANTIC", tier: "MID" },
  { name: "Keystone Commonwealth", nickname: "Founders", abbreviation: "KCU", city: "Harrisburg", state: "Pennsylvania", stateCode: "PA", divisionId: "ATLANTIC", tier: "POWER" },
  { name: "Pine Coast", nickname: "Lumberjacks", abbreviation: "PCU", city: "Portland", state: "Maine", stateCode: "ME", divisionId: "ATLANTIC", tier: "LOW" },
  { name: "Granite State", nickname: "Mountaineers", abbreviation: "GSU", city: "Concord", state: "New Hampshire", stateCode: "NH", divisionId: "ATLANTIC", tier: "MID" },
  { name: "Green Mountain", nickname: "Catamounts", abbreviation: "GMU", city: "Burlington", state: "Vermont", stateCode: "VT", divisionId: "ATLANTIC", tier: "LOW" },
  { name: "Bay Commonwealth", nickname: "Harbor Guards", abbreviation: "BCU", city: "Worcester", state: "Massachusetts", stateCode: "MA", divisionId: "ATLANTIC", tier: "POWER" },
  { name: "Narragansett", nickname: "Navigators", abbreviation: "NAR", city: "Providence", state: "Rhode Island", stateCode: "RI", divisionId: "ATLANTIC", tier: "LOW" },
  { name: "Charter Oak", nickname: "Sentinels", abbreviation: "COU", city: "Hartford", state: "Connecticut", stateCode: "CT", divisionId: "ATLANTIC", tier: "MID" },
  { name: "Garden State Tech", nickname: "Ironclads", abbreviation: "GST", city: "Newark", state: "New Jersey", stateCode: "NJ", divisionId: "ATLANTIC", tier: "MID" },
  { name: "First State", nickname: "Privateers", abbreviation: "FSU", city: "Dover", state: "Delaware", stateCode: "DE", divisionId: "ATLANTIC", tier: "LOW" },
  { name: "Blue Ridge Commonwealth", nickname: "Foxhounds", abbreviation: "BRC", city: "Roanoke", state: "Virginia", stateCode: "VA", divisionId: "ATLANTIC", tier: "MID" },

  { name: "Lake Erie", nickname: "Storm", abbreviation: "LER", city: "Cleveland", state: "Ohio", stateCode: "OH", divisionId: "GREAT_LAKES", tier: "POWER" },
  { name: "Great Lakes Tech", nickname: "Copperheads", abbreviation: "GLT", city: "Grand Rapids", state: "Michigan", stateCode: "MI", divisionId: "GREAT_LAKES", tier: "POWER" },
  { name: "Crossroads State", nickname: "Racers", abbreviation: "CRS", city: "Indianapolis", state: "Indiana", stateCode: "IN", divisionId: "GREAT_LAKES", tier: "MID" },
  { name: "Prairie State", nickname: "Falcons", abbreviation: "PRU", city: "Springfield", state: "Illinois", stateCode: "IL", divisionId: "GREAT_LAKES", tier: "MID" },
  { name: "Northwoods", nickname: "Timberwolves", abbreviation: "NWU", city: "Madison", state: "Wisconsin", stateCode: "WI", divisionId: "GREAT_LAKES", tier: "MID" },
  { name: "Twin Rivers State", nickname: "Voyageurs", abbreviation: "TRS", city: "Saint Paul", state: "Minnesota", stateCode: "MN", divisionId: "GREAT_LAKES", tier: "MID" },
  { name: "Cedar Valley", nickname: "Bison", abbreviation: "CVU", city: "Cedar Rapids", state: "Iowa", stateCode: "IA", divisionId: "GREAT_LAKES", tier: "LOW" },
  { name: "Bluegrass Commonwealth", nickname: "Thoroughbreds", abbreviation: "BGC", city: "Lexington", state: "Kentucky", stateCode: "KY", divisionId: "GREAT_LAKES", tier: "MID" },
  { name: "Cumberland State", nickname: "Copper Kings", abbreviation: "CUS", city: "Knoxville", state: "Tennessee", stateCode: "TN", divisionId: "GREAT_LAKES", tier: "LOW" },
  { name: "Gateway State", nickname: "Archers", abbreviation: "GWS", city: "Saint Louis", state: "Missouri", stateCode: "MO", divisionId: "GREAT_LAKES", tier: "LOW" },
  { name: "Dakota Plains", nickname: "Stampede", abbreviation: "DPU", city: "Fargo", state: "North Dakota", stateCode: "ND", divisionId: "GREAT_LAKES", tier: "LOW" },
  { name: "Kanawha", nickname: "Black Bears", abbreviation: "KAN", city: "Charleston", state: "West Virginia", stateCode: "WV", divisionId: "GREAT_LAKES", tier: "LOW" },

  { name: "Lone Star Metropolitan", nickname: "Wranglers", abbreviation: "LSM", city: "Dallas", state: "Texas", stateCode: "TX", divisionId: "HEARTLAND", tier: "POWER" },
  { name: "Trinity State", nickname: "Longhorn Frogs", abbreviation: "TRI", city: "Fort Worth", state: "Texas", stateCode: "TX", divisionId: "HEARTLAND", tier: "POWER" },
  { name: "Alamo Commonwealth", nickname: "Defenders", abbreviation: "ALC", city: "San Antonio", state: "Texas", stateCode: "TX", divisionId: "HEARTLAND", tier: "MID" },
  { name: "Gulf Prairie", nickname: "Roughnecks", abbreviation: "GPU", city: "Houston", state: "Texas", stateCode: "TX", divisionId: "HEARTLAND", tier: "MID" },
  { name: "Red River State", nickname: "Outlaws", abbreviation: "RRS", city: "Oklahoma City", state: "Oklahoma", stateCode: "OK", divisionId: "HEARTLAND", tier: "MID" },
  { name: "Green Country", nickname: "Renegades", abbreviation: "GCU", city: "Tulsa", state: "Oklahoma", stateCode: "OK", divisionId: "HEARTLAND", tier: "LOW" },
  { name: "Flint Hills", nickname: "Prairie Hawks", abbreviation: "FHU", city: "Topeka", state: "Kansas", stateCode: "KS", divisionId: "HEARTLAND", tier: "MID" },
  { name: "Sunflower Tech", nickname: "Cyclones", abbreviation: "SFT", city: "Wichita", state: "Kansas", stateCode: "KS", divisionId: "HEARTLAND", tier: "LOW" },
  { name: "Ozark State", nickname: "Boars", abbreviation: "OZS", city: "Fayetteville", state: "Arkansas", stateCode: "AR", divisionId: "HEARTLAND", tier: "MID" },
  { name: "Delta Ridge", nickname: "Mallards", abbreviation: "DRU", city: "Little Rock", state: "Arkansas", stateCode: "AR", divisionId: "HEARTLAND", tier: "LOW" },
  { name: "Black Hills", nickname: "Bighorns", abbreviation: "BHU", city: "Rapid City", state: "South Dakota", stateCode: "SD", divisionId: "HEARTLAND", tier: "LOW" },
  { name: "Platte River State", nickname: "Pioneers", abbreviation: "PRS", city: "Lincoln", state: "Nebraska", stateCode: "NE", divisionId: "HEARTLAND", tier: "LOW" },

  { name: "Crescent City", nickname: "Krewe", abbreviation: "CCU", city: "New Orleans", state: "Louisiana", stateCode: "LA", divisionId: "GULF", tier: "POWER" },
  { name: "Peachtree Commonwealth", nickname: "Firebirds", abbreviation: "PTC", city: "Atlanta", state: "Georgia", stateCode: "GA", divisionId: "GULF", tier: "POWER" },
  { name: "Acadiana State", nickname: "Gators", abbreviation: "ACS", city: "Lafayette", state: "Louisiana", stateCode: "LA", divisionId: "GULF", tier: "MID" },
  { name: "Magnolia State", nickname: "River Kings", abbreviation: "MGS", city: "Jackson", state: "Mississippi", stateCode: "MS", divisionId: "GULF", tier: "LOW" },
  { name: "Iron City", nickname: "Vulcans", abbreviation: "ICU", city: "Birmingham", state: "Alabama", stateCode: "AL", divisionId: "GULF", tier: "MID" },
  { name: "Mobile Bay", nickname: "Admirals", abbreviation: "MBU", city: "Mobile", state: "Alabama", stateCode: "AL", divisionId: "GULF", tier: "LOW" },
  { name: "Sun Coast", nickname: "Sharks", abbreviation: "SCU", city: "Tampa", state: "Florida", stateCode: "FL", divisionId: "GULF", tier: "MID" },
  { name: "Everglades State", nickname: "Pythons", abbreviation: "EVS", city: "Fort Lauderdale", state: "Florida", stateCode: "FL", divisionId: "GULF", tier: "MID" },
  { name: "Savannah Commonwealth", nickname: "Marshals", abbreviation: "SVC", city: "Savannah", state: "Georgia", stateCode: "GA", divisionId: "GULF", tier: "LOW" },
  { name: "Palmetto State", nickname: "Corsairs", abbreviation: "PMS", city: "Columbia", state: "South Carolina", stateCode: "SC", divisionId: "GULF", tier: "MID" },
  { name: "Cape Fear", nickname: "Reavers", abbreviation: "CFU", city: "Wilmington", state: "North Carolina", stateCode: "NC", divisionId: "GULF", tier: "LOW" },
  { name: "Piedmont State", nickname: "Pilots", abbreviation: "PDS", city: "Greensboro", state: "North Carolina", stateCode: "NC", divisionId: "GULF", tier: "LOW" },

  { name: "Front Range", nickname: "Summit", abbreviation: "FRU", city: "Denver", state: "Colorado", stateCode: "CO", divisionId: "MOUNTAIN", tier: "POWER" },
  { name: "Sonoran State", nickname: "Scorpions", abbreviation: "SNS", city: "Phoenix", state: "Arizona", stateCode: "AZ", divisionId: "MOUNTAIN", tier: "POWER" },
  { name: "Big Sky", nickname: "Grizzlies", abbreviation: "BSU", city: "Missoula", state: "Montana", stateCode: "MT", divisionId: "MOUNTAIN", tier: "MID" },
  { name: "Gem State", nickname: "Miners", abbreviation: "GEM", city: "Boise", state: "Idaho", stateCode: "ID", divisionId: "MOUNTAIN", tier: "LOW" },
  { name: "High Plains", nickname: "Mustangs", abbreviation: "HPU", city: "Cheyenne", state: "Wyoming", stateCode: "WY", divisionId: "MOUNTAIN", tier: "LOW" },
  { name: "Pikes Peak", nickname: "Rams", abbreviation: "PPU", city: "Colorado Springs", state: "Colorado", stateCode: "CO", divisionId: "MOUNTAIN", tier: "MID" },
  { name: "Wasatch State", nickname: "Elk", abbreviation: "WST", city: "Salt Lake City", state: "Utah", stateCode: "UT", divisionId: "MOUNTAIN", tier: "MID" },
  { name: "Red Rock", nickname: "Rattlers", abbreviation: "RRU", city: "Saint George", state: "Utah", stateCode: "UT", divisionId: "MOUNTAIN", tier: "LOW" },
  { name: "Silver State", nickname: "High Rollers", abbreviation: "SSU", city: "Las Vegas", state: "Nevada", stateCode: "NV", divisionId: "MOUNTAIN", tier: "MID" },
  { name: "Sierra Basin", nickname: "Pronghorns", abbreviation: "SBU", city: "Reno", state: "Nevada", stateCode: "NV", divisionId: "MOUNTAIN", tier: "LOW" },
  { name: "Canyon State", nickname: "Roadrunners", abbreviation: "CNS", city: "Tucson", state: "Arizona", stateCode: "AZ", divisionId: "MOUNTAIN", tier: "MID" },
  { name: "Rio Grande", nickname: "Lobos", abbreviation: "RGU", city: "Albuquerque", state: "New Mexico", stateCode: "NM", divisionId: "MOUNTAIN", tier: "LOW" },

  { name: "Golden Coast", nickname: "Condors", abbreviation: "GCO", city: "Los Angeles", state: "California", stateCode: "CA", divisionId: "PACIFIC", tier: "POWER" },
  { name: "Puget Sound", nickname: "Orcas", abbreviation: "PSU", city: "Seattle", state: "Washington", stateCode: "WA", divisionId: "PACIFIC", tier: "POWER" },
  { name: "Rainier State", nickname: "Evergreens", abbreviation: "RSU", city: "Tacoma", state: "Washington", stateCode: "WA", divisionId: "PACIFIC", tier: "MID" },
  { name: "Willamette", nickname: "Beavers", abbreviation: "WIL", city: "Salem", state: "Oregon", stateCode: "OR", divisionId: "PACIFIC", tier: "MID" },
  { name: "Cascade Tech", nickname: "Ospreys", abbreviation: "CTU", city: "Bend", state: "Oregon", stateCode: "OR", divisionId: "PACIFIC", tier: "LOW" },
  { name: "Bay City", nickname: "Seals", abbreviation: "BCS", city: "San Francisco", state: "California", stateCode: "CA", divisionId: "PACIFIC", tier: "MID" },
  { name: "Redwood State", nickname: "Giants", abbreviation: "RWS", city: "Eureka", state: "California", stateCode: "CA", divisionId: "PACIFIC", tier: "LOW" },
  { name: "Central Valley", nickname: "Foxes", abbreviation: "CTV", city: "Fresno", state: "California", stateCode: "CA", divisionId: "PACIFIC", tier: "MID" },
  { name: "Pacific Mesa", nickname: "Tritons", abbreviation: "PMU", city: "San Diego", state: "California", stateCode: "CA", divisionId: "PACIFIC", tier: "MID" },
  { name: "Sierra Gold", nickname: "Prospectors", abbreviation: "SGU", city: "Sacramento", state: "California", stateCode: "CA", divisionId: "PACIFIC", tier: "LOW" },
  { name: "Alaska Frontier", nickname: "Kodiaks", abbreviation: "AFU", city: "Anchorage", state: "Alaska", stateCode: "AK", divisionId: "PACIFIC", tier: "LOW" },
  { name: "Island State", nickname: "Volcanoes", abbreviation: "ISU", city: "Honolulu", state: "Hawaii", stateCode: "HI", divisionId: "PACIFIC", tier: "LOW" }
] as const;

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
  game: { possessions: 24, homeFieldAdvantage: 2.8, upsetNoise: 11 }
};

export const CAREER_PATHS: Record<CareerPath, { label: string; tier: "LOW" | "MID" | "POWER"; budget: number; initialSecurity: number; championshipDeadline: number | null }> = {
  DYNASTY_BUILDER: { label: "Dynasty Builder", tier: "LOW", budget: 1_500_000, initialSecurity: 92, championshipDeadline: null },
  PROGRAM_RISER: { label: "Program Riser", tier: "MID", budget: 6_000_000, initialSecurity: 65, championshipDeadline: null },
  CHAMPIONSHIP_MANDATE: { label: "Championship Mandate", tier: "POWER", budget: 20_000_000, initialSecurity: 40, championshipDeadline: 2 }
};
