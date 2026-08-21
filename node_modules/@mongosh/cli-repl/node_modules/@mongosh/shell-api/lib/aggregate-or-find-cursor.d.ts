import type { Document, ExplainVerbosityLike, ServiceProviderFindCursor, ServiceProviderAggregationCursor } from '@mongosh/service-provider-core';
import { AbstractFiniteCursor } from './abstract-cursor';
export declare abstract class AggregateOrFindCursor<CursorType extends ServiceProviderAggregationCursor | ServiceProviderFindCursor> extends AbstractFiniteCursor<CursorType> {
    projection(spec: Document): this;
    skip(value: number): this;
    sort(spec: Document): this;
    explain(verbosity?: ExplainVerbosityLike): Promise<any>;
}
