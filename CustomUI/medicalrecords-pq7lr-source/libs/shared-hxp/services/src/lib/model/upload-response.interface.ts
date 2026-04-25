/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

/**
 * Represents a response from an upload operation.
 * This interface is structurally compatible with AxiosResponse
 * but avoids a direct dependency on axios.
 *
 * The properties match the AxiosResponse interface structure:
 * - data: The response data
 * - status: HTTP status code
 * - statusText: HTTP status message
 * - headers: Response headers
 * - config: Request configuration
 * - request: Optional underlying request object
 */
export interface UploadResponse<T = any> {
    /** The response data */
    data: T;
    /** HTTP status code */
    status: number;
    /** HTTP status text */
    statusText: string;
    /** Response headers */
    headers: any;
    /** Request configuration used for the request */
    config: any;
    /** Optional underlying request object */
    request?: unknown;
}
