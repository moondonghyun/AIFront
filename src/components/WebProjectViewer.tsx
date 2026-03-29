import { useEffect, useMemo, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, File, Folder } from "lucide-react";
import type { WebFile, FullWebProject } from "@/lib/gemini-direct";

interface WebProjectViewerProps {
  project: FullWebProject;
  projectName: string;
}

function buildFileTree(files: WebFile[]) {
  const tree: Record<string, WebFile[]> = {};
  for (const file of files) {
    const parts = file.path.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "(root)";
    if (!tree[dir]) tree[dir] = [];
    tree[dir].push(file);
  }
  return tree;
}

function getLanguage(path: string): string {
  if (path.endsWith(".tsx") || path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".html")) return "html";
  return "text";
}

function CodeViewer({ file }: { file: WebFile | null }) {
  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        파일을 선택하세요
      </div>
    );
  }
  return (
    <div className="h-full overflow-auto bg-[#1e1e1e]">
      <div className="sticky top-0 flex items-center gap-2 border-b border-white/10 bg-[#252526] px-4 py-2">
        <File className="h-3.5 w-3.5 text-blue-400" />
        <span className="text-xs font-medium text-white/70">{file.path}</span>
        <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/40">
          {getLanguage(file.path)}
        </span>
      </div>
      <pre className="p-4 text-[12.5px] leading-relaxed text-green-200/90" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
        <code>{file.content}</code>
      </pre>
    </div>
  );
}

export default function WebProjectViewer({ project, projectName }: WebProjectViewerProps) {
  const [selectedFile, setSelectedFile] = useState<WebFile | null>(
    project.files[0] ?? null,
  );
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(
    new Set(["src", "src/pages", "src/components"]),
  );

  const previewBlobUrl = useMemo(() => {
    if (!project.previewHtml) return "";
    const blob = new Blob([project.previewHtml], { type: "text/html;charset=utf-8" });
    return URL.createObjectURL(blob);
  }, [project.previewHtml]);

  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  const tree = buildFileTree(project.files);
  const dirs = Object.keys(tree).sort();

  function toggleDir(dir: string) {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
  }

  return (
    <Tabs defaultValue="preview" className="flex h-[780px] flex-col">
      <TabsList className="h-9 w-fit rounded-none border-b border-border bg-transparent px-0">
        <TabsTrigger value="preview" className="rounded-none border-b-2 border-transparent px-4 text-sm data-[state=active]:border-foreground data-[state=active]:bg-transparent">
          미리보기
        </TabsTrigger>
        <TabsTrigger value="code" className="rounded-none border-b-2 border-transparent px-4 text-sm data-[state=active]:border-foreground data-[state=active]:bg-transparent">
          React+TS 코드 ({project.files.length}개 파일)
        </TabsTrigger>
      </TabsList>

      <TabsContent value="preview" className="mt-0 flex-1 overflow-hidden">
        {previewBlobUrl ? (
          <iframe
            src={previewBlobUrl}
            title={`${projectName} 미리보기`}
            className="h-full w-full border-none"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            미리보기를 불러올 수 없습니다.
          </div>
        )}
      </TabsContent>

      <TabsContent value="code" className="mt-0 flex-1 overflow-hidden">
        {project.files.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            파일이 생성되지 않았습니다.
          </div>
        ) : (
          <PanelGroup direction="horizontal" className="h-full">
            <Panel defaultSize={22} minSize={15} maxSize={35}>
              <div className="h-full overflow-auto border-r border-border bg-[#252526] py-2">
                <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                  {projectName}
                </div>
                {dirs.map((dir) => (
                  <div key={dir}>
                    {dir !== "(root)" && (
                      <button
                        onClick={() => toggleDir(dir)}
                        className="flex w-full items-center gap-1 px-3 py-0.5 text-left text-xs text-white/60 hover:bg-white/5"
                      >
                        <ChevronRight
                          className={`h-3 w-3 transition-transform ${expandedDirs.has(dir) ? "rotate-90" : ""}`}
                        />
                        <Folder className="h-3 w-3 text-yellow-400/70" />
                        {dir.split("/").pop()}
                      </button>
                    )}
                    {(dir === "(root)" || expandedDirs.has(dir)) &&
                      tree[dir].map((file) => (
                        <button
                          key={file.path}
                          onClick={() => setSelectedFile(file)}
                          className={`flex w-full items-center gap-1.5 py-0.5 pr-3 text-left text-xs hover:bg-white/5 ${
                            selectedFile?.path === file.path ? "bg-white/10 text-blue-300" : "text-white/50"
                          }`}
                          style={{ paddingLeft: dir === "(root)" ? "12px" : "28px" }}
                        >
                          <File className="h-3 w-3 shrink-0 text-blue-400/60" />
                          <span className="truncate">{file.path.split("/").pop()}</span>
                        </button>
                      ))}
                  </div>
                ))}
              </div>
            </Panel>

            <PanelResizeHandle className="w-px bg-border hover:bg-foreground/30 transition-colors" />

            <Panel defaultSize={78}>
              <CodeViewer file={selectedFile} />
            </Panel>
          </PanelGroup>
        )}
      </TabsContent>
    </Tabs>
  );
}
