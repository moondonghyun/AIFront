import type { RenderedHomeStyleOption } from "@/lib/home-style-types";

interface HomeScreenPreviewProps {
  option: RenderedHomeStyleOption;
  compact?: boolean;
}

const HomeScreenPreview = ({ option, compact = false }: HomeScreenPreviewProps) => {
  const height = compact ? 500 : 640;

  return (
    <div className="relative mx-auto w-full max-w-[320px] overflow-hidden rounded-[28px] border border-border shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
      <iframe
        srcDoc={option.html}
        title={option.name}
        style={{ width: 320, height, border: "none", display: "block" }}
        scrolling="no"
      />
    </div>
  );
};

export default HomeScreenPreview;
