import { Header } from "@/components/layout/header"

interface PageHeaderProps {
  title: string
  subtitle?: string
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return <Header title={title} subtitle={subtitle} />
}
