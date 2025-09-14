/**
 * Shared message types and schemas for CanIParkHere
 * This should match the backend MessageType enum and response models
 */

import type { ChatMessage, MessageData } from '@/types';
import { MessageType, MessageDataType, ParkingCategory } from '@/types';

// Re-export types for backward compatibility
export { MessageType, MessageDataType, ParkingCategory };

/**
 * Base message structure
 * @typedef {Object} Message
 * @property {number} id - Unique message ID (timestamp)
 * @property {string} type - MessageType enum value
 * @property {string} content - Display text for the message
 * @property {Object|null} data - Additional structured data
 * @property {Date} timestamp - When message was created
 */

/**
 * Compression data structure
 * @typedef {Object} CompressionData
 * @property {string} type - 'compression'
 * @property {number} originalSize - Original file size in bytes
 * @property {number} compressedSize - Compressed file size in bytes
 * @property {string} compressionRatio - Percentage reduction (e.g. "73.2")
 * @property {string} previewUrl - Blob URL for preview image
 * @property {Object} dimensions - {width, height} in pixels
 * @property {boolean} success - Whether compression succeeded
 */

/**
 * Error with preview data structure
 * @typedef {Object} ErrorWithPreviewData
 * @property {string} type - 'error_with_preview'
 * @property {string} previewUrl - Blob URL for the image that failed
 * @property {string} error - Error message
 * @property {string} suggestion - User-friendly suggestion
 */

/**
 * Parking result data structure (matches ParkingCheckResponse from backend)
 * @typedef {Object} ParkingResultData
 * @property {string} type - 'parking_result'
 * @property {string} session_id - Session ID for follow-up questions
 * @property {string} isParkingSignFound - "true" | "false"
 * @property {string} canPark - "true" | "false" | "uncertain"
 * @property {string} reason - Explanation of the decision
 * @property {string} rules - Full text of parking rules
 * @property {string} parsedText - Raw OCR text
 * @property {string} advice - Additional advice
 * @property {string} processing_method - How it was processed
 */

/**
 * Location result data structure
 * @typedef {Object} LocationResultData
 * @property {string} type - 'location_result'
 * @property {boolean} canPark - Whether parking is allowed
 * @property {string} message - Descriptive message
 * @property {string} processing_method - "location_api"
 * @property {number} latitude - Location latitude
 * @property {number} longitude - Location longitude
 */

/**
 * Factory functions for creating messages with proper structure
 */
export const MessageFactory = {
  /**
   * Create a bot message
   */
  bot: (content: string, data?: MessageData): ChatMessage => ({
    id: crypto.randomUUID(),
    type: MessageType.BOT,
    content,
    data,
    timestamp: new Date()
  }),

  /**
   * Create a user message
   */
  user: (content: string, data?: MessageData): ChatMessage => ({
    id: crypto.randomUUID(),
    type: MessageType.USER,
    content,
    data,
    timestamp: new Date()
  }),

  /**
   * Create a parking result message
   */
  parking: (content: string, parkingData: MessageData): ChatMessage => ({
    id: Date.now().toString(),
    type: MessageType.PARKING,
    content,
    data: {
      type: MessageDataType.PARKING_RESULT,
      ...parkingData
    },
    timestamp: new Date()
  }),

  /**
   * Create an error message
   */
  error: (content: string, errorData?: MessageData): ChatMessage => ({
    id: Date.now().toString(),
    type: MessageType.ERROR,
    content,
    data: errorData,
    timestamp: new Date()
  }),

  /**
   * Create a compression preview message
   */
  compression: (content: string, compressionData: MessageData) => ({
    id: Date.now().toString(),
    type: MessageType.USER,
    content,
    data: {
      type: MessageDataType.COMPRESSION,
      ...compressionData
    },
    timestamp: new Date()
  }),

  /**
   * Create an error with preview message
   */
  errorWithPreview: (content: string, previewData: MessageData) => ({
    id: Date.now().toString(),
    type: MessageType.ERROR,
    content,
    data: {
      type: MessageDataType.ERROR_WITH_PREVIEW,
      ...previewData
    },
    timestamp: new Date()
  })
};

/**
 * Validation helpers
 */
export const MessageValidator = {
  isValidType: (type: unknown) => Object.values(MessageType).includes(type as MessageType),
  isValidDataType: (dataType: unknown) => Object.values(MessageDataType).includes(dataType as MessageDataType),

  hasValidStructure: (message: unknown) => {
    const msg = message as Record<string, unknown>;
    return message &&
           typeof msg.id === 'string' &&
           MessageValidator.isValidType(msg.type) &&
           typeof msg.content === 'string' &&
           msg.timestamp instanceof Date;
  }
};