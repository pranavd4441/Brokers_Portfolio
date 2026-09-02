import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Check, MessageCircle, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Message, MessageContent, MessageFooter } from '@/components/ui/message';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';

const swatches = [
  ['Background', 'bg-background'],
  ['Surface', 'bg-card'],
  ['Muted', 'bg-muted'],
  ['Primary', 'bg-primary'],
  ['Warm accent', 'bg-[var(--ui-accent-warm)]'],
  ['Danger', 'bg-destructive'],
];

function Foundation() {
  return (
    <main className="min-h-screen w-full bg-background p-6 text-foreground sm:p-10">
      <section className="mx-auto flex max-w-5xl flex-col gap-6">
        <header>
          <p className="os-kicker">QUIET ESTATE · V2 FOUNDATION</p>
          <h1 className="os-page-title mt-1">Luxury outside. Efficiency inside.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            The production fixture for semantic colour, compact density, accessible controls,
            property cards, and WhatsApp message surfaces.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {swatches.map(([label, colour]) => (
            <div key={label} className="overflow-hidden rounded-xl border bg-card">
              <div className={`h-16 ${colour}`} />
              <p className="border-t px-3 py-2 text-[11px] font-semibold">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Inventory controls</CardTitle>
              <CardDescription>44 px targets and broker-first hierarchy</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <label className="relative block">
                <span className="sr-only">Search listings</span>
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-10" placeholder="Search property or locality" />
              </label>
              <NativeSelect aria-label="Listing status">
                <NativeSelectOption>All statuses</NativeSelectOption>
                <NativeSelectOption>Available</NativeSelectOption>
                <NativeSelectOption>Draft</NativeSelectOption>
              </NativeSelect>
              <div className="flex flex-wrap gap-2">
                <Button type="button"><Check data-icon="inline-start" />Publish listing</Button>
                <Button type="button" variant="outline">Save draft</Button>
                <Badge variant="secondary">Available</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/35">
            <CardHeader>
              <CardTitle>Conversation primitives</CardTitle>
              <CardDescription>Direction, time, and assistant state remain explicit</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Message align="start">
                <MessageContent className="max-w-[80%] items-start">
                  <Bubble><BubbleContent>Create a 2 BHK listing in Baner.</BubbleContent></Bubble>
                  <MessageFooter className="mt-1 text-[10px] text-muted-foreground">text · 1:42 pm</MessageFooter>
                </MessageContent>
              </Message>
              <Message align="end">
                <MessageContent className="max-w-[80%] items-end">
                  <Bubble align="end" variant="tinted"><BubbleContent>Your private draft is ready for review.</BubbleContent></Bubble>
                  <MessageFooter className="mt-1 gap-1 text-[10px] text-muted-foreground"><MessageCircle size={11} />recorded</MessageFooter>
                </MessageContent>
              </Message>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-[var(--ui-success)]">Shared foundation: semantic themes, responsive controls, and touch-friendly targets.</p>
      </section>
    </main>
  );
}

const meta = {
  title: 'Foundation/Quiet Estate V2',
  component: Foundation,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Foundation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};

export const Dark: Story = {
  decorators: [
    (Story) => <div data-theme="dark" className="dark"><Story /></div>,
  ],
};
