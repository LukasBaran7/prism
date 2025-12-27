import Link from "next/link";
import { ArrowLeft, BookOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TriageHeaderProps {
  staleCount: number;
  unreadCount: number;
}

export function TriageHeader({ staleCount, unreadCount }: TriageHeaderProps) {
  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <h1 className="text-xl font-bold tracking-tight">Reading Triage</h1>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Unread:</span>
            <span className="font-semibold">{unreadCount.toLocaleString()}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Stale:</span>
            <span className="font-semibold text-amber-600">{staleCount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

