export default function AdminStartupsLoading() {
  return (
    <div className="mx-auto w-full max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:max-w-[80rem]">
      <div className="mb-8 flex items-center gap-4">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div>
          <div className="h-9 w-72 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="mt-1 h-5 w-96 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-80 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-10 w-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>

      <div className="h-96 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}
