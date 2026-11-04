import type { Metadata } from 'next';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/newsreader/400.css';
import './globals.css';
export const metadata: Metadata = { title: 'Recall Voice — a conversation worth keeping', description: 'A multilingual voice workspace with inspectable memory and real tools.' };
export default function RootLayout({ children }: Readonly<{children:React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
