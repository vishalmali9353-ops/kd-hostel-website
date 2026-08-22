import type { ServiceProviderChangeStream, Document, ResumeToken } from '@mongosh/service-provider-core';
import { CursorIterationResult } from './result';
import { asPrintable } from './enums';
import type Mongo from './mongo';
import { BaseCursor } from './abstract-cursor';
export default class ChangeStreamCursor extends BaseCursor<ServiceProviderChangeStream> {
    _currentIterationResult: CursorIterationResult | null;
    _on: string;
    constructor(cursor: ServiceProviderChangeStream, on: string, mongo: Mongo);
    _it(): Promise<CursorIterationResult>;
    [asPrintable](): Promise<string>;
    hasNext(): Promise<boolean>;
    tryNext(): Promise<Document | null>;
    isExhausted(): never;
    next(): Promise<Document>;
    getResumeToken(): ResumeToken;
    toArray(): never;
    batchSize(): never;
    objsLeftInBatch(): never;
    maxTimeMS(): never;
}
