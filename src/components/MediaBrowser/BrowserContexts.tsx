import React, {useMemo, useState} from 'react';
import MediaAlbum from 'types/MediaAlbum';
import {ShowActionsMenuContext, showActionsMenu} from 'components/Actions';
import SyntheticAlbumContext from 'components/Actions/SyntheticAlbumContext';

export interface BrowserContextsProps {
    children: React.ReactNode;
}

export default function BrowserContexts({children}: BrowserContextsProps) {
    const [syntheticAlbum, setSyntheticAlbum] = useState<MediaAlbum | undefined>();
    const syntheticAlbumState = useMemo(
        () => ({syntheticAlbum, setSyntheticAlbum}),
        [syntheticAlbum, setSyntheticAlbum]
    );

    return (
        <ShowActionsMenuContext value={showActionsMenu}>
            <SyntheticAlbumContext value={syntheticAlbumState}>{children}</SyntheticAlbumContext>
        </ShowActionsMenuContext>
    );
}
