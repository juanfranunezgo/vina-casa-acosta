type Note = {
  label: string;
  tone: "fruit" | "spice" | "wood" | "earth" | "floral" | "default";
};

const toneStyles: Record<Note["tone"], string> = {
  fruit:
    "bg-[#7a1a1f]/12 text-[#5c0e15] border-[#7a1a1f]/30 hover:bg-[#7a1a1f]/20",
  spice:
    "bg-[#8a4a1a]/12 text-[#5c2f0e] border-[#8a4a1a]/30 hover:bg-[#8a4a1a]/20",
  wood: "bg-[#6b4226]/12 text-[#3d2614] border-[#6b4226]/30 hover:bg-[#6b4226]/20",
  earth:
    "bg-[#3f3a2c]/12 text-[#2a2620] border-[#3f3a2c]/30 hover:bg-[#3f3a2c]/20",
  floral:
    "bg-[#7c2a4f]/12 text-[#4f1632] border-[#7c2a4f]/30 hover:bg-[#7c2a4f]/20",
  default:
    "bg-primary/8 text-primary border-primary/25 hover:bg-primary/15",
};

function classifyNote(raw: string): Note["tone"] {
  const n = raw.toLowerCase();
  if (
    /(ciruela|cassis|cereza|mora|frambuesa|frutas? roj|frutas? negr|grosella|arándano|plum|cherry|berry|blackcurrant|cassis|raspberry|ameixa|cereja|amora|framboesa)/.test(
      n,
    )
  )
    return "fruit";
  if (/(pimien|clavo|canela|cardamomo|pepper|spice|clove|cinnamon)/.test(n))
    return "spice";
  if (
    /(roble|vainilla|tabaco|cuero|chocolate|cacao|tostado|oak|vanilla|leather|tobacco|cocoa|toasted|carvalho|baunilha|couro|tabaco)/.test(
      n,
    )
  )
    return "wood";
  if (/(tierra|mineral|grafit|earthy|mineral|graphite|terra)/.test(n))
    return "earth";
  if (/(rosa|violeta|jazmín|flora|rose|violet|jasmine|floral|flor)/.test(n))
    return "floral";
  return "default";
}

type Props = {
  notes: string[];
};

export default function TastingProfile({ notes }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {notes.map((note) => {
        const tone = classifyNote(note);
        return (
          <span
            key={note}
            className={`inline-flex items-center px-3 py-1.5 rounded-full border text-label-sm font-body font-medium uppercase tracking-wider transition-colors ${toneStyles[tone]}`}
          >
            {note}
          </span>
        );
      })}
    </div>
  );
}
