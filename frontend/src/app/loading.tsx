export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
      <div className="mb-10">
        <div className="skeleton h-10 w-64" />
        <div className="skeleton mt-3 h-5 w-96" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="skeleton mb-4 h-10 w-10 rounded-xl" />
            <div className="skeleton h-10 w-20" />
            <div className="skeleton mt-2 h-3 w-32" />
            <div className="skeleton mt-4 h-5 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
