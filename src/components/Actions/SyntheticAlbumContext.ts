import {createContext} from 'react';
import MediaAlbum from 'types/MediaAlbum';

export interface SyntheticAlbumContextState {
    readonly syntheticAlbum: MediaAlbum | undefined;
    readonly setSyntheticAlbum: (album: MediaAlbum | undefined) => void;
}

const initialState: SyntheticAlbumContextState = {
    syntheticAlbum: undefined,
    setSyntheticAlbum: () => undefined,
};

const SyntheticAlbumContext = createContext<SyntheticAlbumContextState>(initialState);

export default SyntheticAlbumContext;
