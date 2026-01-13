import CsvUploader from '@/components/csv-uploader';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <CsvUploader />
    </main>
  );
}
