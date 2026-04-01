"use client";

import { useMemo, useState } from "react";
import { useRealtimeCollection, deleteRow } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Newspaper, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type PostRow = {
    id: string;
    title?: string;
    author_id?: string;
    status?: string;
    published_date?: string | null;
    summary?: string;
    created_at?: string;
};

export function ContentModerationPanel() {
    const { toast } = useToast();
    const [deleteTarget, setDeleteTarget] = useState<{ table: string; id: string; title: string } | null>(
        null
    );
    const [deleting, setDeleting] = useState(false);

    const draftsOpts = useMemo(
        () => ({
            table: "draft_posts" as const,
            limitCount: 200,
            enabled: true,
        }),
        []
    );
    const publishedOpts = useMemo(
        () => ({
            table: "published_posts" as const,
            limitCount: 200,
            enabled: true,
        }),
        []
    );

    const { data: drafts, isLoading: dLoading } = useRealtimeCollection<PostRow>(draftsOpts);
    const { data: published, isLoading: pLoading } = useRealtimeCollection<PostRow>(publishedOpts);

    const sortedDrafts = useMemo(() => {
        const list = drafts ?? [];
        return [...list].sort(
            (a, b) =>
                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
    }, [drafts]);

    const sortedPublished = useMemo(() => {
        const list = published ?? [];
        return [...list].sort(
            (a, b) =>
                new Date(b.published_date || b.created_at || 0).getTime() -
                new Date(a.published_date || a.created_at || 0).getTime()
        );
    }, [published]);

    const runDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteRow(deleteTarget.table, deleteTarget.id);
            toast({ title: "Removed", description: "The post was deleted from Firestore." });
            setDeleteTarget(null);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Delete failed";
            toast({ variant: "destructive", title: "Error", description: msg });
        } finally {
            setDeleting(false);
        }
    };

    const PostTable = ({
        rows,
        loading,
        table,
        dateKey,
    }: {
        rows: PostRow[];
        loading: boolean;
        table: string;
        dateKey: "created_at" | "published_date";
    }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author UID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground">
                            Loading…
                        </TableCell>
                    </TableRow>
                ) : rows.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground">
                            No rows.
                        </TableCell>
                    </TableRow>
                ) : (
                    rows.map((row) => {
                        const raw = dateKey === "published_date" ? row.published_date : row.created_at;
                        const dt = raw ? format(new Date(raw), "MMM d, yyyy HH:mm") : "—";
                        return (
                            <TableRow key={row.id}>
                                <TableCell className="max-w-[200px] font-medium truncate">
                                    {row.title || "(no title)"}
                                </TableCell>
                                <TableCell className="font-mono text-xs max-w-[140px] truncate">
                                    {row.author_id || "—"}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{dt}</TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive"
                                        onClick={() =>
                                            setDeleteTarget({
                                                table,
                                                id: row.id,
                                                title: row.title || row.id,
                                            })
                                        }
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })
                )}
            </TableBody>
        </Table>
    );

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Newspaper className="h-5 w-5" />
                        <CardTitle>Market content</CardTitle>
                    </div>
                    <CardDescription>
                        Members use <strong>Market Insights</strong> and drafts. Remove spam, duplicates, or mistaken
                        posts when someone reports an issue.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="published">
                        <TabsList>
                            <TabsTrigger value="published">
                                Published <Badge variant="secondary" className="ml-1">{sortedPublished.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="drafts">
                                Drafts <Badge variant="secondary" className="ml-1">{sortedDrafts.length}</Badge>
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="published" className="mt-4">
                            <PostTable
                                rows={sortedPublished}
                                loading={pLoading}
                                table="published_posts"
                                dateKey="published_date"
                            />
                        </TabsContent>
                        <TabsContent value="drafts" className="mt-4">
                            <PostTable
                                rows={sortedDrafts}
                                loading={dLoading}
                                table="draft_posts"
                                dateKey="created_at"
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <span className="font-medium text-foreground">{deleteTarget?.title}</span> — this cannot be
                            undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <Button variant="destructive" disabled={deleting} onClick={() => void runDelete()}>
                            {deleting ? "Deleting…" : "Delete"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
