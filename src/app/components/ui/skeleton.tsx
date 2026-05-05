export function Skeleton({ className = '', ...props }: React.ComponentProps<'div'>) {
    return (
        <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} {...props} />
    );
}

export function AdCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm h-full flex flex-col">
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <div className="pt-2 flex items-center gap-2">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-3 w-2/3" />
                </div>
            </div>
        </div>
    );
}

export function AdDetailsSkeleton() {
    return (
        <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-3/4" />
                        <div className="flex gap-4">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                    <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
                    <div className="bg-white p-6 rounded-2xl space-y-4">
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl space-y-6">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-16 w-full rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                </div>
            </div>
        </div>
    );
}
