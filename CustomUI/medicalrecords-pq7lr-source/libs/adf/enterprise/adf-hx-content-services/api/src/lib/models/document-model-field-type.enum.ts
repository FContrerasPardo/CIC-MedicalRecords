/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const FieldType = {
    Boolean: 'boolean',
    BooleanArray: 'boolean[]',
    Blob: 'blob',
    BlobArray: 'blob[]',
    Complex: 'complex',
    Date: 'date',
    DateArray: 'date[]',
    Float: 'double',
    FloatArray: 'double[]',
    Integer: 'long',
    IntegerArray: 'long[]',
    Object: 'object',
    String: 'string',
    StringArray: 'string[]',
    User: 'user',
    UserArray: 'user[]',
} as const;

export type FieldType = typeof FieldType[keyof typeof FieldType];
