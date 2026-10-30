import React, {useMemo} from 'react';
import MediaObject from 'types/MediaObject';
import TabList from 'components/TabList';
import MediaInfo, {MediaInfoProps} from './MediaInfo';
import MediaDetails from './MediaDetails';
import './MediaInfoTabs.scss';

export default function MediaInfoTabs<T extends MediaObject>({
    item,
    scrobblingOptions,
}: MediaInfoProps<T>) {
    const tabs = useMemo(() => {
        return [
            {
                tab: 'Info',
                panel: <MediaInfo item={item} scrobblingOptions={scrobblingOptions} />,
            },
            {
                tab: 'Details',
                panel: <MediaDetails item={item} />,
            },
        ];
    }, [item, scrobblingOptions]);

    return <TabList className="media-info-tabs" items={tabs} label="Media info" />;
}
