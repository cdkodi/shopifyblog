import { z } from 'zod'

export const topicSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  keywords: z.string()
    .max(500, 'Keywords cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
  tone: z.string().optional(),
  length: z.string().optional(),
  template: z.string().optional(),
})

export type TopicFormData = z.infer<typeof topicSchema>

// Validation for filters
export const topicFilterSchema = z.object({
  industry: z.string().optional(),
  market_segment: z.string().optional(),
  priority_min: z.number().min(1).max(10).optional(),
  priority_max: z.number().min(1).max(10).optional(),
  search: z.string().optional(),
})

export type TopicFilterData = z.infer<typeof topicFilterSchema> 