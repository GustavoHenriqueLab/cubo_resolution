export default function DepartamentoLoading() {
  return (
    <div className="mx-auto w-full max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:max-w-[80rem]">
      <div className="mb-6 h-5 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />

      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div>
          <div className="h-9 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-5 w-80 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="h-[42px] w-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    </div>
  );
}
