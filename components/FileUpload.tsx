"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface Props {
  label: string;
  accept: Record<string, string[]>;
  file: File | null;
  onFile: (file: File) => void;
  hint: string;
}

export default function FileUpload({ label, accept, file, onFile, hint }: Props) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFile(accepted[0]);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    maxSize: 4 * 1024 * 1024, // Vercel 4.5MB 제한 대응
  });

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-amber-600/80 uppercase tracking-widest">
        {label}
      </label>
      <div
        {...getRootProps()}
        className={`
          flex flex-col items-center justify-center gap-2 rounded-xl
          border border-dashed p-6 cursor-pointer transition-all duration-200
          ${isDragActive
            ? "border-amber-500/70 bg-amber-900/20"
            : file
              ? "border-emerald-600/50 bg-emerald-900/15"
              : "border-indigo-700/40 bg-indigo-950/40 hover:border-amber-700/50 hover:bg-amber-900/10"
          }
        `}
        style={{ minHeight: 120 }}
      >
        <input {...getInputProps()} />
        {file ? (
          <>
            <span className="text-2xl">✅</span>
            <p className="text-xs font-medium text-emerald-400 text-center break-all px-2">
              {file.name}
            </p>
            <p className="text-[10px] text-slate-600">클릭하거나 드래그해서 변경</p>
          </>
        ) : (
          <>
            <span className="text-2xl text-slate-600">📄</span>
            <p className="text-xs text-slate-500 text-center">
              {isDragActive ? "여기에 놓으세요" : "클릭하거나 드래그하세요"}
            </p>
            <p className="text-[10px] text-slate-700">{hint}</p>
          </>
        )}
      </div>
    </div>
  );
}
