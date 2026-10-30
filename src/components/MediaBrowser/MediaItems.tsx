import React, {useMemo, useState} from 'react';
import MediaItem from 'types/MediaItem';
import MediaSource from 'types/MediaSource';
import {getServiceFromSrc} from 'services/mediaServices';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import MediaItemList from 'components/MediaList/MediaItemList';
import MediaObjectBrowser from 'components/MediaObjectBrowser';
import useFirstValue from 'hooks/useFirstValue';
import {PagedItemsProps} from './PagedItems';

export default function MediaItems({service, source, ...props}: PagedItemsProps<MediaItem>) {
    const [[selectedItem], setSelectedItem] = useState<readonly MediaItem[]>([]);
    const [error, setError] = useState<unknown>();

    const itemList = (
        <MediaItemList
            {...props}
            title={source.title}
            source={source}
            level={1}
            onError={setError}
            onSelect={setSelectedItem}
        />
    );

    return (
        <div className="panel">
            {source.singular ? (
                <MediaObjectBrowser
                    service={service}
                    source={source}
                    item={selectedItem}
                    itemList={itemList}
                    error={error}
                >
                    <MixedMediaItems source={source} item={selectedItem} />
                </MediaObjectBrowser>
            ) : (
                itemList
            )}
        </div>
    );
}

interface MixedMediaItemsProps {
    source: MediaSource<MediaItem>;
    item: MediaItem | undefined;
}

function MixedMediaItems({source, item}: MixedMediaItemsProps) {
    const originalItem = useFirstValue(item); // Prevent re-renders if the object is updated.

    const pager = useMemo(() => {
        if (originalItem) {
            const service = getServiceFromSrc(originalItem);
            if (service?.createSongsPager) {
                const pager = service.createSongsPager(originalItem);
                if (pager) {
                    return pager;
                }
            }
            return new SimpleMediaPager(async () => [originalItem]);
        } else {
            return null;
        }
    }, [originalItem]);

    return (
        <MediaItemList
            className="mixed-media-items"
            title={source.title}
            source={source}
            pager={pager}
            level={2}
        />
    );
}
