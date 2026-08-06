export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:max-w-[80rem]">
      <div className="mb-10">
        <div className="skeleton h-10 w-44" />
        <div className="skeleton mt-3 h-5 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div>
                <div className="skeleton h-5 w-32" />
                <div className="skeleton mt-1 h-3 w-24" />
              </div>
            </div>
            <div className="skeleton h-4 w-full mb-2" />
            <div className="skeleton h-4 w-3/4" />
            <div className="mt-4 flex gap-2">
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
