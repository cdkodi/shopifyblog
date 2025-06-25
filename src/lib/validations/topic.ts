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
  industry: z.string()
    .optional()
    .or(z.literal('')),
  market_segment: z.string()
    .optional()
    .or(z.literal('')),
  style_preferences: z.object({
    tone: z.string().optional(),
    length: z.string().optional(),
    target_audience: z.string().optional(),
    template: z.string().optional(),
  }).optional(),
  priority: z.number()
    .min(1, 'Priority must be between 1-10')
    .max(10, 'Priority must be between 1-10')
    .default(5),
  search_volume: z.number()
    .min(0, 'Search volume cannot be negative')
    .optional()
    .or(z.literal('')),
  competition_score: z.number()
    .min(0, 'Competition score must be between 0-100')
    .max(100, 'Competition score must be between 0-100')
    .optional()
    .or(z.literal('')),
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