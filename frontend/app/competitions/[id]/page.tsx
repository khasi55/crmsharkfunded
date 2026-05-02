import CompetitionDetailsClient from "./CompetitionDetailsClient";

export default async function CompetitionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    // Renders the Client Component for Competition Details
    return <CompetitionDetailsClient competitionId={id} />;
}
