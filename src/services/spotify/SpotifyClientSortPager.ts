import {mergeMap, tap} from 'rxjs';
import {getSourceSorting, observeSourceSorting} from 'services/mediaServices/servicesSettings';
import SequentialPager from 'services/pagers/SequentialPager';
import MediaObject from 'types/MediaObject';
import {PagerConfig} from 'types/Pager';
import SortParams from 'types/SortParams';
import {exists, Logger} from 'utils';
import {SpotifyPage} from './SpotifyPager';
import {spotifyApiCallWithRetry} from './spotifyApi';
import {addUserData, createMediaObject, createSortableMediaArtist} from './spotifyUtils';

const MAX_ITEMS = 2000;
const FETCH_SIZE = 50;
const DEFAULT_PAGE_SIZE = 50;

enum ArtistItemType {
    String = 'artist',
    Number = 2,
}

const logger = new Logger('SpotifyClientSortPager');

export default class SpotifyClientSortPager<T extends MediaObject> extends SequentialPager<T> {
    private allItems: T[] = [];
    private isFullyLoaded = false;
    private currentPage = 0;

    constructor(
        private fetchData: (offset: number, limit: number, cursor: string) => Promise<SpotifyPage>,
        private sortId?: string,
        options?: Partial<PagerConfig>,
        private inLibrary?: boolean,
        private secondarySortId?: string
    ) {
        const {itemKey, ...restOptions} = options || {};
        const pageSize = (options && options.pageSize) || DEFAULT_PAGE_SIZE;
        const pagerConfig: PagerConfig<T> = {
            pageSize,
            ...restOptions,
        } as PagerConfig<T>;
        if (itemKey && typeof itemKey === 'string' && itemKey in ({} as T)) {
            (pagerConfig as any).itemKey = itemKey;
        }
        super(async (pageSize: number) => {
            if (!this.isFullyLoaded) {
                await this.loadAllData();
                this.isFullyLoaded = true;
            }

            const startIndex = this.currentPage * pageSize;
            const endIndex = startIndex + pageSize;
            const items = this.allItems.slice(startIndex, endIndex);
            this.currentPage++;

            return {
                items,
                total: this.allItems.length,
                atEnd: endIndex >= this.allItems.length,
            };
        }, pagerConfig);
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();

            if (!this.config.passive) {
                this.subscribeTo(
                    this.observeAdditions().pipe(
                        mergeMap((items: readonly T[]) => addUserData(items))
                    ),
                    logger
                );
            }

            if (this.sortId) {
                this.subscribeTo(
                    observeSourceSorting(this.sortId).pipe(
                        tap((sortParams) => {
                            if (sortParams && this.allItems.length > 0) {
                                this.applySorting(this.allItems, sortParams);
                                this.resetPagination();
                            }
                        })
                    ),
                    logger
                );
            }
        }
    }

    private async loadAllData(): Promise<void> {
        this.allItems = await this.fetchAllItems();
        this.applySortingIfNeeded();
    }

    private async fetchAllItems(): Promise<T[]> {
        const allItems: T[] = [];
        let hasMore = true;
        let currentOffset = 0;
        let cursor = '';

        while (hasMore && allItems.length < MAX_ITEMS) {
            try {
                const page = await spotifyApiCallWithRetry(() =>
                    this.fetchData(currentOffset, FETCH_SIZE, cursor)
                );

                const mediaItems = page.items
                    .filter(exists)
                    .map((item) => this.createCustomMediaObject(item)) as T[];

                allItems.push(...mediaItems);
                hasMore = !!page.next && page.items.length === FETCH_SIZE;
                currentOffset += FETCH_SIZE;
                cursor = page.next || '';
            } catch (error) {
                console.error('Error fetching Spotify data:', error);
                hasMore = false;
            }
        }

        return allItems;
    }

    private createCustomMediaObject(item: any): T {
        if (this.secondarySortId && item.type === ArtistItemType.String) {
            return createSortableMediaArtist(item, this.inLibrary, this.secondarySortId) as T;
        }

        return createMediaObject(item, this.inLibrary) as T;
    }

    private resetPagination(): void {
        this.currentPage = 0;
        const pageSize = this.config.pageSize || DEFAULT_PAGE_SIZE;
        const firstPage = this.allItems.slice(0, pageSize);
        this.items = firstPage;
        this.currentPage = 1;
    }

    private applySortingIfNeeded(): void {
        if (this.sortId && this.allItems.length > 0) {
            const sortParams = getSourceSorting(this.sortId);
            if (sortParams) {
                this.applySorting(this.allItems, sortParams);
            }
        }
    }

    private applySorting(items: T[], sortParams: SortParams): void {
        if (this.isArtistAddedAtSort(items, sortParams.sortBy)) {
            if (sortParams.sortOrder === 1) {
                items.reverse();
            }
        } else {
            items.sort((a, b) => this.compareItems(a, b, sortParams));
        }
    }

    private isArtistAddedAtSort(items: T[], sortBy: string): boolean {
        return (
            sortBy === 'added_at' &&
            items.length > 0 &&
            (items[0] as any).itemType === ArtistItemType.Number
        );
    }

    private compareItems(a: T, b: T, {sortBy, sortOrder}: SortParams): number {
        const valueA = this.getPropertyValue(a, sortBy);
        const valueB = this.getPropertyValue(b, sortBy);
        return this.compareValues(valueA, valueB, sortOrder);
    }

    private getPropertyValue(obj: any, path: string): any {
        switch (path) {
            case 'title':
            case 'name':
                return obj.title || obj.name || '';
            case 'artist':
                return obj.artist || obj.albumArtist || '';
            case 'addedAt':
            case 'added_at':
                return obj.addedAt || 0;
            default:
                return obj[path] || (typeof obj[path] === 'number' ? 0 : '');
        }
    }

    private compareValues(a: any, b: any, sortOrder: number): number {
        if (a == null && b == null) return 0;
        if (a == null) return sortOrder * -1;
        if (b == null) return sortOrder * 1;

        if (typeof a === 'string' && typeof b === 'string') {
            return (
                sortOrder *
                a.localeCompare(b, undefined, {
                    numeric: true,
                    sensitivity: 'base',
                })
            );
        }

        if (typeof a === 'number' && typeof b === 'number') {
            return sortOrder * (a - b);
        }

        if (a instanceof Date && b instanceof Date) {
            return sortOrder * (a.getTime() - b.getTime());
        }

        const strA = String(a || '');
        const strB = String(b || '');
        return (
            sortOrder *
            strA.localeCompare(strB, undefined, {
                numeric: true,
                sensitivity: 'base',
            })
        );
    }
}
