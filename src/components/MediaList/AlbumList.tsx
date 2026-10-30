import React, {useCallback, useContext} from 'react';
import MediaAlbum from 'types/MediaAlbum';
import {SyntheticAlbumContext} from 'components/Actions';
import MediaList, {MediaListProps} from './MediaList';
import {albumsLayout} from './layouts';

export default function AlbumList({
    className = '',
    defaultLayout = albumsLayout,
    draggable = true,
    onSelect,
    ...props
}: MediaListProps<MediaAlbum>) {
    const {setSyntheticAlbum} = useContext(SyntheticAlbumContext);

    const handleSelect = useCallback(
        (albums: readonly MediaAlbum[]) => {
            const [album] = albums;
            setSyntheticAlbum(album?.synthetic ? album : undefined);
            onSelect?.(albums);
        },
        [setSyntheticAlbum, onSelect]
    );

    return (
        <MediaList
            {...props}
            className={`albums ${className}`}
            defaultLayout={defaultLayout}
            draggable={draggable}
            onSelect={handleSelect}
        />
    );
}
