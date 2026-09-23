import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export type FormatFileProps =
  | "doc"
  | "pdf"
  | "md"
  | "mdx"
  | "csv"
  | "xls"
  | "xlsx"
  | "txt"
  | "ppt"
  | "pptx"
  | "zip"
  | "rar"
  | "tar"
  | "gz"
  | "code"
  | "html"
  | "js"
  | "jsx"
  | "tsx"
  | "css"
  | "json"
  | "img"
  | "png"
  | "jpg"
  | "jpeg"
  | "video";

export function getFormatFile(filename: string): FormatFileProps {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "pdf":
      return "pdf";
    case "doc":
    case "docx":
      return "doc";
    case "xls":
      return "xls";
    case "xlsx":
      return "xlsx";
    case "csv":
      return "csv";
    case "ppt":
      return "ppt";
    case "pptx":
      return "pptx";
    case "zip":
      return "zip";
    case "rar":
      return "rar";
    case "tar":
      return "tar";
    case "gz":
    case "7z":
      return "gz";
    case "md":
      return "md";
    case "mdx":
      return "mdx";
    case "txt":
      return "txt";
    case "json":
      return "json";
    case "css":
      return "css";
    case "html":
      return "html";
    case "js":
      return "js";
    case "jsx":
      return "jsx";
    case "ts":
    case "tsx":
      return "tsx";
    case "png":
      return "png";
    case "jpg":
      return "jpg";
    case "jpeg":
      return "jpeg";
    case "gif":
    case "webp":
    case "svg":
      return "img";
    case "mp4":
    case "mov":
    case "avi":
    case "mkv":
    case "webm":
      return "video";
    default:
      return "code";
  }
}

type FileCardProps = {
  formatFile: FormatFileProps;
  className?: string;
  size?: "sm" | "md";
};

const DefaultPlaceholder = () => {
  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <div className="bg-slate-400/50 h-0.5 w-1/2 rounded-full" />
      </div>
      <div className="flex gap-1">
        <div className="bg-slate-300/70 h-0.5 w-1/3 rounded-full" />
        <div className="bg-slate-300/70 h-0.5 w-1/3 rounded-full" />
      </div>
      <div className="flex gap-1">
        <div className="bg-slate-300/70 h-0.5 w-1/2 rounded-full" />
        <div className="bg-slate-300/70 h-0.5 w-1/3 rounded-full" />
      </div>
      <div className="flex gap-1">
        <div className="bg-slate-300/70 h-0.5 w-1/3 rounded-full" />
        <div className="bg-slate-300/70 h-0.5 w-1/3 rounded-full" />
      </div>
      <div className="flex gap-1">
        <div className="bg-slate-300/70 h-0.5 w-1/3 rounded-full" />
        <div className="bg-slate-300/70 h-0.5 w-1/2 rounded-full" />
      </div>
      <div className="flex gap-1">
        <div className="bg-slate-300/70 h-0.5 w-1/3 rounded-full" />
      </div>
    </div>
  );
};

const colorBannerMap: Record<FormatFileProps, string> = {
  doc: "bg-blue-500 text-white",
  pdf: "bg-red-500 text-white",
  md: "bg-neutral-600 text-white",
  mdx: "bg-neutral-600 text-white",
  txt: "bg-gray-500 text-white",
  csv: "bg-teal-700 text-white",
  xls: "bg-emerald-600 text-white",
  xlsx: "bg-emerald-600 text-white",
  ppt: "bg-orange-500 text-white",
  pptx: "bg-orange-500 text-white",
  zip: "bg-purple-500 text-white",
  rar: "bg-purple-600 text-white",
  tar: "bg-yellow-600 text-white",
  gz: "bg-yellow-700 text-white",
  html: "bg-orange-600 text-white",
  js: "bg-yellow-600 text-white",
  jsx: "bg-blue-600 text-white",
  css: "bg-blue-600 text-white",
  json: "bg-yellow-500 text-white",
  tsx: "bg-blue-600 text-white",
  code: "bg-orange-600 text-white",
  img: "bg-pink-500 text-white",
  png: "bg-neutral-600 text-white",
  jpg: "bg-green-700 text-white",
  jpeg: "bg-green-700 text-white",
  video: "bg-green-700 text-white",
};

export const FileCard = ({ formatFile, className, size = "md" }: FileCardProps) => {
  const colorBannerClass = colorBannerMap[formatFile] || "bg-slate-600 text-white";
  let filePlaceholder: ReactNode = <DefaultPlaceholder />;

  if (formatFile === "md" || formatFile === "mdx") {
    filePlaceholder = (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <div className="text-slate-400 text-[9px] font-bold leading-none">#</div>
          <div className="bg-slate-400/50 h-0.5 w-5 rounded-full" />
        </div>
        <div className="space-y-0.5">
          <div className="bg-slate-300/70 h-0.5 w-1/3 rounded-full" />
          <div className="bg-slate-300/70 h-0.5 w-6 rounded-full" />
        </div>
        <div className="space-y-0.5">
          <div className="bg-slate-300/70 h-0.5 w-7 rounded-full" />
          <div className="bg-slate-300/70 h-0.5 w-4 rounded-full" />
        </div>
      </div>
    );
  } else if (formatFile === "xls" || formatFile === "xlsx") {
    filePlaceholder = (
      <div className="space-y-0.5">
        <div className="grid grid-cols-3 gap-0.5">
          <div className="bg-emerald-500/40 h-1.5 rounded-[1px]" />
          <div className="bg-emerald-500/40 h-1.5 rounded-[1px]" />
          <div className="bg-emerald-500/40 h-1.5 rounded-[1px]" />
        </div>
        <div className="grid grid-cols-3 gap-0.5">
          <div className="bg-slate-200/90 h-1.5 rounded-[1px]" />
          <div className="bg-slate-200/90 h-1.5 rounded-[1px]" />
          <div className="bg-slate-200/90 h-1.5 rounded-[1px]" />
          <div className="bg-slate-200/90 h-1.5 rounded-[1px]" />
          <div className="bg-slate-200/90 h-1.5 rounded-[1px]" />
          <div className="bg-slate-200/90 h-1.5 rounded-[1px]" />
        </div>
        <div className="grid grid-cols-3 gap-0.5">
          <div className="bg-slate-200/90 h-1.5 rounded-[1px]" />
          <div className="bg-slate-200/90 h-1.5 rounded-[1px]" />
        </div>
      </div>
    );
  } else if (formatFile === "csv") {
    filePlaceholder = (
      <div className="space-y-1">
        <div className="grid grid-cols-3 gap-0.5">
          <div className="bg-teal-500/40 h-1 rounded-full" />
          <div className="bg-teal-500/40 h-1 rounded-full" />
          <div className="bg-teal-500/40 h-1 rounded-full" />
        </div>
        <div className="space-y-0.5">
          <div className="grid grid-cols-3 gap-0.5">
            <div className="bg-slate-200/90 h-1 rounded-full" />
            <div className="bg-slate-200/90 h-1 rounded-full" />
            <div className="bg-slate-200/90 h-1 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            <div className="bg-slate-200/90 h-1 rounded-full" />
            <div className="bg-slate-200/90 h-1 rounded-full" />
            <div className="bg-slate-200/90 h-1 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            <div className="bg-slate-200/90 h-1 rounded-full" />
            <div className="bg-slate-200/90 h-1 rounded-full" />
          </div>
        </div>
      </div>
    );
  } else if (
    formatFile === "zip" ||
    formatFile === "rar" ||
    formatFile === "tar" ||
    formatFile === "gz"
  ) {
    filePlaceholder = (
      <div className="relative flex h-full flex-col items-center justify-center py-0.5">
        <div className="space-y-0.5">
          <div className="flex overflow-hidden rounded-full gap-0.5">
            <div className="bg-purple-500/50 size-1 rounded-full" />
            <div className="bg-slate-200 size-1 rounded-full" />
          </div>
          <div className="flex overflow-hidden rounded-full gap-0.5">
            <div className="bg-slate-200 size-1 rounded-full" />
            <div className="bg-purple-500/50 size-1 rounded-full" />
          </div>
          <div className="flex overflow-hidden rounded-full gap-0.5">
            <div className="bg-purple-500/50 size-1 rounded-full" />
            <div className="bg-slate-200 size-1 rounded-full" />
          </div>
          <div className="flex overflow-hidden rounded-full gap-0.5">
            <div className="bg-slate-200 size-1 rounded-full" />
            <div className="bg-purple-500/50 size-1 rounded-full" />
          </div>
          <div className="flex overflow-hidden rounded-full gap-0.5">
            <div className="bg-purple-500/50 size-1 rounded-full" />
            <div className="bg-slate-200 size-1 rounded-full" />
          </div>
        </div>
      </div>
    );
  } else if (formatFile === "ppt" || formatFile === "pptx") {
    filePlaceholder = (
      <div className="space-y-1">
        <div className="bg-amber-50/70 space-y-1 rounded border border-amber-200/60 p-1">
          <div className="flex justify-center">
            <div className="size-2.5 rounded-sm bg-orange-400/70" />
          </div>
          <div className="bg-slate-300/70 mx-auto h-0.5 w-6 rounded-full" />
        </div>
        <div className="flex justify-center">
          <div className="bg-slate-300/70 mx-auto h-0.5 w-6 rounded-full" />
        </div>
      </div>
    );
  } else if (
    formatFile === "img" ||
    formatFile === "png" ||
    formatFile === "jpg" ||
    formatFile === "jpeg"
  ) {
    filePlaceholder = (
      <div className="space-y-1">
        <div className="bg-slate-50 space-y-1 rounded border border-slate-200/80 p-1">
          <div className="flex justify-center">
            <div className="size-2.5 rounded-full bg-amber-400/80" />
          </div>
          <div className="bg-slate-300/70 mx-auto mt-0.5 h-0.5 w-4 rounded-full" />
          <div className="bg-slate-300/70 mx-auto h-0.5 w-6 rounded-full" />
        </div>
      </div>
    );
  } else if (formatFile === "video") {
    filePlaceholder = (
      <div className="space-y-1">
        <div className="bg-slate-50 space-y-1 rounded border border-slate-200/80 p-1">
          <div className="flex justify-center items-center h-4">
            <div className="size-0 border-y-[4px] border-l-[7px] border-y-transparent border-l-emerald-500/80" />
          </div>
          <div className="bg-slate-300/70 mx-auto h-0.5 w-6 rounded-full" />
        </div>
      </div>
    );
  } else if (
    formatFile === "html" ||
    formatFile === "js" ||
    formatFile === "jsx" ||
    formatFile === "tsx" ||
    formatFile === "code"
  ) {
    filePlaceholder = (
      <div className="space-y-0.5 font-mono text-[7px] text-slate-400 leading-none">
        <div className="flex items-center gap-0.5">
          <span>&lt;</span>
          <span className="h-0.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
          <span>&gt;</span>
        </div>
        <div className="flex items-center gap-0.5 pl-1">
          <span>&lt;</span>
          <span className="h-0.5 w-2 rounded-full bg-sky-500/80 inline-block" />
          <span>/&gt;</span>
        </div>
        <div className="flex items-center gap-0.5">
          <span>&lt;/</span>
          <span className="h-0.5 w-2 rounded-full bg-emerald-500/80 inline-block" />
          <span>&gt;</span>
        </div>
      </div>
    );
  } else if (formatFile === "css") {
    filePlaceholder = (
      <div className="space-y-0.5 font-mono text-[7px] text-slate-400 leading-none">
        <div>{"{"}</div>
        <div className="pl-1 space-y-0.5">
          <div className="h-0.5 w-3 rounded-full bg-sky-500/80" />
          <div className="h-0.5 w-2 rounded-full bg-sky-500/80" />
        </div>
        <div>{"}"}</div>
      </div>
    );
  } else if (formatFile === "json") {
    filePlaceholder = (
      <div className="space-y-0.5 font-mono text-[7px] text-slate-400 leading-none">
        <div>{"{"}</div>
        <div className="pl-1 space-y-0.5">
          <div className="bg-amber-500/70 h-0.5 w-3 rounded-full" />
          <div className="bg-slate-300/70 h-0.5 w-2 rounded-full" />
        </div>
        <div>{"}"}</div>
      </div>
    );
  }

  const dimensions =
    size === "sm"
      ? "w-11 h-14 p-1.5"
      : "w-12 h-15 p-2";

  return (
    <div aria-hidden className={cn("relative shrink-0 select-none", className)}>
      {/* Corner Format Pill */}
      <div
        className={cn(
          "absolute -right-1.5 -bottom-1 z-10 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider shadow-sm",
          colorBannerClass
        )}
      >
        {formatFile}
      </div>

      {/* Styled Crisp Light Document Card */}
      <div
        className={cn(
          "relative z-1 rounded-xl bg-white border border-slate-200/90 shadow-sm ring-1 ring-slate-900/5 flex flex-col justify-start overflow-hidden",
          dimensions
        )}
      >
        {filePlaceholder}
      </div>
    </div>
  );
};

export default FileCard;
