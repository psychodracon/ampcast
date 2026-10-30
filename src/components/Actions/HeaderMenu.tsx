import React from 'react';
import Action from 'types/Action';
import MediaAlbum from 'types/MediaAlbum';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import PopupMenu, {PopupMenuProps, PopupMenuSeparator, showPopupMenu} from 'components/PopupMenu';
import {ActionsMenuItems} from './ActionsMenu';
import {MediaSourceMenuItems} from './MediaSourceMenu';

export interface ShowHeaderMenuParams {
    item: MediaObject;
    target: HTMLElement;
    x: number;
    y: number;
    source?: MediaSource<any> ;
    syntheticAlbum?: MediaAlbum;
}

export async function showHeaderMenu({
    target,
    x,
    y,
    ...params
}: ShowHeaderMenuParams): Promise<Action | undefined> {
    return showPopupMenu(
        (props: PopupMenuProps<Action>) => <HeaderMenu {...props} {...params} />,
        target,
        x,
        y,
        'right'
    );
}

export type HeaderMenuProps = Pick<ShowHeaderMenuParams, 'source' | 'item' | 'syntheticAlbum'>;

function HeaderMenu({
    item,
    source,
    syntheticAlbum,
    ...props
}: PopupMenuProps<Action> & HeaderMenuProps) {
    return (
        <PopupMenu {...props}>
            <ActionsMenuItems items={[item]} />
            {source ? (
                <>
                    <PopupMenuSeparator />
                    <MediaSourceMenuItems source={source} syntheticAlbum={syntheticAlbum} />
                </>
            ) : null}
        </PopupMenu>
    );
}
