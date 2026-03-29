import { useState } from "react";
import { Plus, X } from "lucide-react";

interface ColorInputQuestionProps {
  answer: string;
  onAnswer: (val: string) => void;
}

function isValidHex(color: string): boolean {
  return /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(color.trim());
}

function parseAnswer(answer: string): string[] {
  if (!answer.trim()) return [""];
  const colors = answer.split(",").map((c) => c.trim());
  return colors.length > 0 ? colors : [""];
}

const ColorInputQuestion = ({ answer, onAnswer }: ColorInputQuestionProps) => {
  const [colors, setColors] = useState<string[]>(() => parseAnswer(answer));

  const update = (newColors: string[]) => {
    setColors(newColors);
    const filled = newColors.filter((c) => c.trim());
    onAnswer(filled.join(", "));
  };

  const handleChange = (index: number, value: string) => {
    const next = [...colors];
    next[index] = value;
    update(next);
  };

  const addColor = () => {
    if (colors.length < 10) update([...colors, ""]);
  };

  const removeColor = (index: number) => {
    if (colors.length <= 1) return;
    update(colors.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 py-2">
      {colors.map((color, index) => (
        <div key={index} className="flex items-center gap-3">
          <div
            className="h-8 w-8 shrink-0 rounded-md border border-border transition-colors"
            style={{
              backgroundColor: isValidHex(color) ? color : "transparent",
            }}
          />
          <input
            type="text"
            value={color}
            onChange={(e) => handleChange(index, e.target.value)}
            placeholder="#000000"
            maxLength={7}
            className="flex-1 border-0 border-b-2 border-border bg-transparent py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-foreground transition-colors"
          />
          {colors.length > 1 && (
            <button
              type="button"
              onClick={() => removeColor(index)}
              className="shrink-0 text-muted-foreground/40 hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}

      {colors.length < 10 && (
        <button
          type="button"
          onClick={addColor}
          className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          색상 추가 ({colors.length} / 10)
        </button>
      )}
    </div>
  );
};

export default ColorInputQuestion;
