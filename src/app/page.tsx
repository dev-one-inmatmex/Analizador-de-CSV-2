import CsvUploader from '@/components/csv-uploader';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-background p-4 sm:p-6 lg:p-8">
      <CsvUploader />
    </main>
  );
}
