import { z } from "zod";

const argvEntry = z.string().min(1);

export const potatoConfigSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    adapterId: z.string().min(1),
    root: z.string().min(1),
    commands: z
      .object({
        start: z.array(argvEntry),
      })
      .strict(),
  })
  .strict();

export type PotatoConfig = z.infer<typeof potatoConfigSchema>;
