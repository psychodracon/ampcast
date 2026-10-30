import {map, of, skipWhile, switchMap, tap} from 'rxjs';
import Visualizer from 'types/Visualizer';
import {Logger} from 'utils';
import audio from 'services/audio';
import {nextVisualizer, noVisualizer, observeNextVisualizer} from 'services/visualizer';
import {observeVisualizerProviders} from 'services/visualizer/visualizerProviders';
import OmniPlayer from './players/OmniPlayer';
import miniPlayer from './miniPlayer';

const logger = new Logger('visualizerPlayer');

const visualizerPlayer = new OmniPlayer<Visualizer>('visualizerPlayer');

visualizerPlayer.loop = true;
visualizerPlayer.muted = true;
visualizerPlayer.volume = 0.07;

observeVisualizerProviders()
    .pipe(
        skipWhile((providers) => providers.length === 0),
        map((providers) => providers.map((provider) => provider.createPlayer(audio))),
        tap((players) => players.forEach((player) => visualizerPlayer.addPlayer(player))),
        switchMap(() => miniPlayer.observeActive()),
        switchMap((active) => (active ? of(noVisualizer) : observeNextVisualizer())),
        tap((visualizer) => visualizerPlayer.load(visualizer))
    )
    .subscribe(logger);

visualizerPlayer
    .observeError()
    .pipe(
        tap(logger.error),
        tap(() => nextVisualizer('error'))
    )
    .subscribe(logger);

export default visualizerPlayer;
