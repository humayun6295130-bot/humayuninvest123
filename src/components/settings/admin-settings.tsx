"use client";

export function AdminSettings() {
  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
                <p className="text-base font-semibold">Administrator Settings</p>
                <p className="text-sm text-muted-foreground">
                    Manage global application settings, user roles, and content categories.
                </p>
            </div>
        </div>
        <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed">
            <p className="text-muted-foreground">More admin settings coming soon.</p>
        </div>
    </div>
  );
}
