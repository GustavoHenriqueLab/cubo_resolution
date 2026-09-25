export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:max-w-[80rem]">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="skeleton h-8 w-40" />
          <div className="skeleton mt-2 h-4 w-72" />
        </div>
        <div className="flex items-center gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-9 w-28 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="mb-4">
        <div className="skeleton h-6 w-32" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-center gap-3">
              <div className="skeleton h-5 w-40" />
              <div className="skeleton h-5 w-24 rounded-full" />
            </div>
            <div className="mt-3 flex gap-4">
              <div className="skeleton h-4 w-28" />
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
