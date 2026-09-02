import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { PropertyPhoto } from '@/components/property/PropertyPhoto';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { workspaceText } from '@/i18n/workspace';
import { inventoryText } from '@/i18n/inventory';
import type { Locale } from '@/i18n';

function WorkspacePreview({ dark = false, locale = 'en' }: { dark?: boolean; locale?: Locale }) {
  const w = (key: Parameters<typeof workspaceText>[1]) => workspaceText(locale, key);
  const c = (key: Parameters<typeof inventoryText>[1]) => inventoryText(locale, key);
  return <div className={dark ? 'dark' : ''}><main className="workspace-shell min-h-screen bg-card p-5 text-foreground sm:p-10"><div className="workspace-page mx-auto max-w-5xl">
    <WorkspaceHeader eyebrow="PROPERTYOS · COMPONENT PREVIEW" title={c('inventoryTitle')} description={c('inventoryIntro')} action={<Button variant="outline"><MessageCircle data-icon="inline-start" />{c('imports')}</Button>} />
    <div className="grid gap-8 sm:grid-cols-2">
      <Card variant="property"><div className="overflow-hidden rounded-2xl"><PropertyPhoto alt="Component preview" fallback={c('noPhoto')} compact /></div><CardHeader><Badge variant="outline"><span className="workspace-state-dot" data-status="DRAFT" />{c('DRAFT')}</Badge><CardTitle>Baner · preview fixture</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{c('draftsHint')}</p></CardContent><CardFooter><Button variant="outline" className="w-full">{c('review')}<ArrowRight data-icon="inline-end" /></Button></CardFooter></Card>
      <section className="workspace-panel self-start"><div className="workspace-panel-heading"><h2>{w('attention')}</h2><Badge variant="secondary">1</Badge></div><article className="workspace-task"><span className="workspace-icon" data-tone="brand"><MessageCircle size={18} /></span><div className="min-w-0 flex-1"><h3>{w('newLead')}</h3><p>Preview fixture · Baner</p></div><Button variant="ghost" size="icon" aria-label={w('review')}><ArrowRight /></Button></article></section>
    </div>
  </div></main></div>;
}

const meta = { title: 'PropertyOS/Workspace v4', component: WorkspacePreview, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof WorkspacePreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = { args: { locale: 'en' } };
export const Dark: Story = { args: { dark: true, locale: 'en' } };
export const Hindi: Story = { args: { locale: 'hi' } };
export const Marathi: Story = { args: { locale: 'mr' } };
