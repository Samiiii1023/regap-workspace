import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./workspace.css";
import "./observatory.css";

const geistSans = localFont({
	src: "./fonts/GeistVF.woff",
	variable: "--font-geist-sans",
	display: "swap",
});
const geistMono = localFont({
	src: "./fonts/GeistMonoVF.woff",
	variable: "--font-geist-mono",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Re:Gap | Research Intelligence",
	description:
		"Connect literature, inspect limitations, explore research gaps, and plan evidence-driven experiments.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${geistSans.variable} ${geistMono.variable}`}>
				{children}
			</body>
		</html>
	);
}
