"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Newspaper, BookOpen, Clock } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function ContentPage() {
  const firestore = useFirestore();

  const publishedQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "published_posts"),
      orderBy("publishedDate", "desc"),
      limit(10)
    );
  }, [firestore]);

  const { data: posts, isLoading } = useCollection(publishedQuery);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Market Insights</h1>
          <p className="text-muted-foreground">Stay ahead with expert analysis and community strategies.</p>
        </div>
        <Button asChild>
          <Link href="/content/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Write Article
          </Link>
        </Button>
      </div>

      <div className="grid gap-6">
        <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <h2>Latest Insights</h2>
        </div>

        {isLoading ? (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="h-24 bg-muted" />
                    </Card>
                ))}
            </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <Card key={post.id} className="group hover:shadow-md transition-shadow">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">Market Update</Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {post.publishedDate ? format(post.publishedDate.toDate(), 'MMM d, yyyy') : 'Recently'}
                        </span>
                    </div>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mt-2">
                    {post.summary}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="link" className="p-0 h-auto" asChild>
                        <Link href={`/content/${post.id}`} className="flex items-center gap-1">
                            Read Full Insight <BookOpen className="h-4 w-4 ml-1" />
                        </Link>
                    </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-48 py-10">
              <Newspaper className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground text-center">
                No insights have been published yet.<br />
                Check back later or share your own thoughts!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
