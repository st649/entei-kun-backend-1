/**
 * app.service.ts
 * @author soltia48
 * @date 2022-10-03
 */

import { Injectable, Logger } from "@nestjs/common";
import * as dayjs from "dayjs";

import {
  DamPreciseScoringTotalScorePrediction,
  DamPreciseScoringTotalScorePredictionCount,
} from "./app.dto";
import { DamPreciseScoringTotalScoreType } from "./types/dam-precise-scoring-total-score-type";
import { rand_r } from "./utilities/rand-r";

/**
 * App service
 */
@Injectable()
export class AppService {
  /**
   * Randomize threshold
   */
  static readonly damPreciseScoringTotalScoreRandomizeThreshold = 99000;
  /**
   * 100.000 threshold
   */
  static readonly damPreciseScoringTotalScore100PointsThreshold = 99990;
  /**
   * 100.000 probability
   */
  static readonly damPreciseScoringTotalScore100PointsProbability = 500;

  /**
   * Logger
   */
  private readonly logger = new Logger(this.constructor.name);

  /**
   * Total score by DAM Precise Scoring from time
   * @param time Time (Unix time)
   * @param rawScore Raw score
   * @return Total score
   */
  private static totalScoreByDamPreciseScoringFromTime(time: number, rawScore = 99999) {
    let result = rawScore;
    if (AppService.damPreciseScoringTotalScoreRandomizeThreshold < result) {
      const randomValue = rand_r(time).random + time;
      result =
        (randomValue % (rawScore - AppService.damPreciseScoringTotalScoreRandomizeThreshold)) +
        AppService.damPreciseScoringTotalScoreRandomizeThreshold;
      if (AppService.damPreciseScoringTotalScore100PointsThreshold < result) {
        const judgement = randomValue % 1000;
        if (judgement < AppService.damPreciseScoringTotalScore100PointsProbability) {
          result = 100000;
        }
      }
    }
    return result;
  }

  /**
   * Predict DAM Precise Scoring total score
   * @param startTime Start time
   * @param timeLimit Time limit
   * @param isJst Is JST
   * @param includeNormal Include normal
   * @param includeQuadruple Include quadruple
   * @param include100 Include 100
   * @return Predictions
   */
  predictDamPreciseScoringTotalScore(
    startTime: dayjs.Dayjs,
    timeLimit: number,
    isJst = true,
    includeNormal = true,
    includeQuadruple = true,
    include100 = true
  ) {
    const start = new Date();

    const result: DamPreciseScoringTotalScorePrediction[] = [];
    for (let i = 0; i < timeLimit; i++) {
      const time = startTime.add(i, "second");
      let unixtime: number;
      if (isJst) {
        unixtime = Math.floor(time.add(9, "hour").valueOf() / 1000);
      } else {
        unixtime = Math.floor(time.valueOf() / 1000);
      }

      const score = AppService.totalScoreByDamPreciseScoringFromTime(unixtime);
      const scoreInteger = Math.floor(score / 1000);
      const scoreFractional = score % 1000;
      const scoreString = `${scoreInteger}.${scoreFractional.toString().padStart(3, "0")}`;

      let scoreType: DamPreciseScoringTotalScoreType;
      if (score === 100000) {
        scoreType = DamPreciseScoringTotalScoreType.Hundred;
      } else if (
        AppService.damPreciseScoringTotalScore100PointsThreshold < score &&
        score !== 100000
      ) {
        scoreType = DamPreciseScoringTotalScoreType.Quadruple;
      } else {
        scoreType = DamPreciseScoringTotalScoreType.Normal;
      }

      if (
        (include100 && scoreType == DamPreciseScoringTotalScoreType.Hundred) ||
        (includeQuadruple && scoreType == DamPreciseScoringTotalScoreType.Quadruple) ||
        (includeNormal && scoreType == DamPreciseScoringTotalScoreType.Normal)
      ) {
        result.push({
          time: time.toISOString(),
          scoreInteger: score,
          scoreString,
          scoreType,
        });
      }
    }

    const end = new Date();
    this.logger.debug(
      `${this.constructor.name}::predictDamPreciseScoringTotalScore() ${
        end.getTime() - start.getTime()
      }ms`
    );

    return result;
  }

  /**
   * Count DAM Precise Scoring total score prediction
   * @param startTime Start time
   * @param timeSpan Time span
   * @param timeLimit Time limit
   * @return Predictions
   */
  countDamPreciseScoringTotalScorePrediction(
    startTime: dayjs.Dayjs,
    timeSpan: number,
    timeLimit: number
  ) {
    const start = new Date();

    const timeSpans = Math.ceil(timeLimit / timeSpan);

    const result: DamPreciseScoringTotalScorePredictionCount[] = [];
    for (let i = 0; i < timeSpans; i++) {
      const localStartTime = startTime.add(i * timeSpan, "second");
      const localTimeSpan =
        i === timeSpans - 1 && timeLimit % timeSpan ? timeLimit % timeSpan : timeSpan;

      let hundredCountUtc = 0;
      let quadrupleCountUtc = 0;
      let hundredCountJst = 0;
      let quadrupleCountJst = 0;
      for (let j = 0; j < localTimeSpan; j++) {
        const timeUtc = localStartTime.add(j, "second");
        const unixtimeUtc = Math.floor(timeUtc.valueOf() / 1000);

        const scoreUtc = AppService.totalScoreByDamPreciseScoringFromTime(unixtimeUtc);
        if (scoreUtc === 100000) {
          hundredCountUtc++;
        } else if (
          AppService.damPreciseScoringTotalScore100PointsThreshold < scoreUtc &&
          scoreUtc !== 100000
        ) {
          quadrupleCountUtc++;
        }

        const unixtimeJst = Math.floor(timeUtc.add(9, "hour").valueOf() / 1000);
        const scoreJst = AppService.totalScoreByDamPreciseScoringFromTime(unixtimeJst);
        if (scoreJst === 100000) {
          hundredCountJst++;
        } else if (
          AppService.damPreciseScoringTotalScore100PointsThreshold < scoreJst &&
          scoreJst !== 100000
        ) {
          quadrupleCountJst++;
        }
      }

      result.push({
        startTime: localStartTime.toISOString(),
        endTime: localStartTime.add(localTimeSpan, "second").toISOString(),
        utc: {
          hundredCount: hundredCountUtc,
          quadrupleCount: quadrupleCountUtc,
        },
        jst: {
          hundredCount: hundredCountJst,
          quadrupleCount: quadrupleCountJst,
        },
      });
    }

    const end = new Date();
    this.logger.debug(
      `${this.constructor.name}::countDamPreciseScoringTotalScorePrediction() ${
        end.getTime() - start.getTime()
      }ms`
    );

    return result;
  }
}
