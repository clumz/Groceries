"use client";

export default function Error({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-4">
      <h2 className="text-xl font-bold text-red-600">Something went wrong</h2>
      <pre className="text-xs text-ink-secondary bg-slate-100 p-4 rounded-xl w-full overflow-auto">
        {error.message}
        {"\n\n"}
        {error.stack}
      </pre>
    </div>
  );
}
