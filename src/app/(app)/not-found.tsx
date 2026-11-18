import { SearchX } from "lucide-react";
import { ButtonLink, Card } from "@/components/ui/primitives";

/** A missing workout / exercise / routine inside the app (notFound() in a signed-in page). */
export default function AppNotFound() {
  return (
    <Card className="mt-6 flex flex-col items-center gap-3 p-6 text-center">
      <SearchX className="size-8 text-label-2" aria-hidden />
      <h1 className="text-title3 font-bold">Not found</h1>
      <p className="max-w-sm text-subhead text-label-2">It may have been deleted, or the link is wrong.</p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <ButtonLink href="/home">Go to Home</ButtonLink>
        <ButtonLink href="/history" variant="gray">
          Open History
        </ButtonLink>
      </div>
    </Card>
  );
}
