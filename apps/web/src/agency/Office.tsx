export function Office({
  clients,
  staff,
  year,
  onRoom,
}: {
  clients: number;
  staff: number;
  year: number;
  onRoom: (room: string) => void;
}) {
  return (
    <div className="as-office">
      <svg
        viewBox="0 0 1100 430"
        role="img"
        aria-label="Your agency office, with a scouting desk, client lounge and meeting room"
      >
        <defs>
          <linearGradient id="officeSky" x2="0" y2="1">
            <stop stopColor="#7badaf" />
            <stop offset="1" stopColor="#e8cda8" />
          </linearGradient>
          <linearGradient id="officeFloor" x2="0" y2="1">
            <stop stopColor="#d9b78d" />
            <stop offset="1" stopColor="#a78160" />
          </linearGradient>
          <pattern
            id="officeBrick"
            width="80"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 0H80M0 32H80M40 0V16M0 16H80M20 16V32M60 16V32"
              stroke="#7a493b"
              fill="none"
              opacity=".3"
            />
          </pattern>
          <filter id="officeShadow">
            <feDropShadow dx="0" dy="5" stdDeviation="5" floodOpacity=".15" />
          </filter>
          <g id="officePerson">
            <ellipse cy="36" rx="22" ry="7" fill="#263e3920" />
            <path
              d="M-10 12L-13 33M10 12L13 33"
              stroke="#293e49"
              strokeWidth="10"
            />
            <path d="M-18-16Q0-29 18-16L15 15H-15Z" fill="#ba6a44" />
            <circle cy="-32" r="13" fill="#cb9571" />
            <path d="M-13-34Q-15-52 2-49Q18-46 13-32L7-40Z" fill="#34352d" />
          </g>
        </defs>
        <rect width="1100" height="430" fill="#233c39" />
        <rect x="20" y="18" width="1060" height="302" fill="#ba7960" />
        <rect
          x="20"
          y="18"
          width="1060"
          height="302"
          fill="url(#officeBrick)"
        />
        <path d="M20 306H1080L1100 430H0Z" fill="url(#officeFloor)" />
        {[70, 330, 650, 880].map((x) => (
          <g key={x}>
            <rect x={x} y="46" width="150" height="160" fill="#32494c" />
            <rect
              x={x + 8}
              y="54"
              width="134"
              height="144"
              fill="url(#officeSky)"
            />
            <path
              d={`M${x + 8} 173l28-40 28 15 23-60 40 47 15-15v78H${x + 8}Z`}
              fill="#637d77"
            />
            <path
              d={`M${x + 75} 54V198M${x + 8} 115H${x + 142}`}
              stroke="#ece5cf"
              strokeWidth="7"
            />
          </g>
        ))}
        <rect x="21" y="224" width="1058" height="81" fill="#e1d2b6" />
        <path d="M20 305H1080" stroke="#514e3d" strokeWidth="10" />
        <path d="M355 20V322M738 20V322" stroke="#ead9b9" strokeWidth="17" />
        <path
          d="M350 325L322 430M740 325L780 430"
          stroke="#80664e"
          strokeWidth="3"
        />
        <rect x="48" y="236" width="247" height="82" rx="4" fill="#4a766d" />
        <rect x="65" y="252" width="96" height="48" fill="#35564e" />
        <rect x="177" y="252" width="100" height="48" fill="#35564e" />
        <g filter="url(#officeShadow)">
          <path d="M84 280H284L303 317H63Z" fill="#d6b081" />
          <path d="M74 315V373M287 315V373" stroke="#3c514b" strokeWidth="10" />
          <rect x="137" y="245" width="77" height="44" rx="4" fill="#2b4448" />
          <rect x="144" y="251" width="63" height="30" fill="#9eb8ac" />
          <path
            d="M152 273l13-11 12 5 20-12"
            stroke="#486856"
            strokeWidth="3"
            fill="none"
          />
          <path d="M174 289V300" stroke="#2b4448" strokeWidth="7" />
        </g>
        <rect x="396" y="203" width="115" height="55" rx="6" fill="#be9b69" />
        <rect x="402" y="210" width="103" height="41" fill="#edddba" />
        <text
          x="453"
          y="229"
          textAnchor="middle"
          fontSize="10"
          fill="#576449"
          letterSpacing="2"
        >
          FIRST CLIENT
        </text>
        <text x="453" y="245" textAnchor="middle" fontSize="12" fill="#344c43">
          {clients ? "SIGNED" : "YOUR NAME HERE"}
        </text>
        <g filter="url(#officeShadow)">
          <rect
            x="422"
            y="295"
            width="228"
            height="65"
            rx="14"
            fill="#466d5e"
          />
          <rect x="434" y="278" width="204" height="57" rx="9" fill="#5f8771" />
          <path d="M445 360V380M628 360V380" stroke="#374d42" strokeWidth="9" />
          <ellipse cx="550" cy="386" rx="77" ry="19" fill="#c09a71" />
          <rect x="523" y="370" width="52" height="9" fill="#f3e8c9" />
        </g>
        <g filter="url(#officeShadow)">
          <ellipse cx="913" cy="312" rx="113" ry="40" fill="#cfa87c" />
          <path
            d="M848 330V389M980 330V389"
            stroke="#41564d"
            strokeWidth="11"
          />
          <rect x="875" y="294" width="47" height="25" rx="3" fill="#efe6cd" />
          <path d="M880 300H911M880 306H902" stroke="#6c8a78" strokeWidth="2" />
        </g>
        <use href="#officePerson" transform="translate(189 340)" />
        {clients > 0 && (
          <g className="as-office-client">
            <use href="#officePerson" transform="translate(490 330)" />
          </g>
        )}
        {clients > 1 && (
          <use href="#officePerson" transform="translate(603 330)" />
        )}
        {clients > 2 && (
          <use href="#officePerson" transform="translate(929 290)" />
        )}
        {staff > 0 && (
          <use href="#officePerson" transform="translate(817 323)" />
        )}
        <g>
          <path
            d="M312 286q-40-54-25-77q24 0 25 42q5-69 31-64q12 37-28 81"
            fill="#477755"
          />
          <path d="M292 272H332L325 308H299Z" fill="#d9b889" />
          <path
            d="M1034 302q-41-49-26-78q29-8 27 49q5-77 31-70q14 42-26 84"
            fill="#477755"
          />
          <path d="M1017 279H1054L1048 317H1024Z" fill="#c1a076" />
        </g>
        <rect
          x="476"
          y="53"
          width="123"
          height="72"
          fill="#213e3a"
          stroke="#dbc29a"
          strokeWidth="5"
        />
        <text
          x="537"
          y="84"
          textAnchor="middle"
          fill="#e4cda8"
          fontSize="14"
          letterSpacing="3"
        >
          ORIGIN
        </text>
        <text
          x="537"
          y="106"
          textAnchor="middle"
          fill="#e4cda8"
          fontSize="9"
          letterSpacing="2"
        >
          SPORTS AGENCY
        </text>
        {[180, 550, 912].map((x) => (
          <g key={x}>
            <path d={`M${x} 20V45`} stroke="#2a3e37" strokeWidth="3" />
            <path d={`M${x - 29} 72Q${x} 30 ${x + 29} 72Z`} fill="#e8c886" />
            <ellipse cx={x} cy="72" rx="29" ry="5" fill="#fff0b6" />
          </g>
        ))}
      </svg>
      <div className="as-office-labels">
        <button onClick={() => onRoom("Scouting")}>
          Scouting desk <span>Find your next client ↗</span>
        </button>
        <button onClick={() => onRoom("Clients")}>
          Client lounge{" "}
          <span>
            {clients} relationships · Year {year - 2026}
          </span>
        </button>
        <button onClick={() => onRoom("Deals")}>
          Meeting room <span>Build the business ↗</span>
        </button>
      </div>
    </div>
  );
}
