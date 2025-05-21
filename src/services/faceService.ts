import * as faceapi from '@vladmandic/face-api';
import path from 'path';
import canvas from 'canvas';
import logger from '../utils/logger';

const { Canvas, Image, ImageData } = canvas;

faceapi.env.monkeyPatch({
  Canvas: Canvas as any,
  Image: Image as any,
  ImageData: ImageData as any,
});

class FaceService {
  private loaded = false;

  async loadModels() {
    if (!this.loaded) {
      const modelPath = path.join(__dirname, '../../models');
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
        this.loaded = true;
        logger.info('Face recognition models loaded successfully');
      } catch (error) {
        logger.error(`Failed to load face recognition models: ${error}`);
        throw error;
      }
    }
  }

  async extractEmbedding(imageBuffer: Buffer): Promise<Float32Array | null> {
    await this.loadModels();

    try {
      const img = await canvas.loadImage(imageBuffer);
      const detection = await faceapi
        .detectSingleFace(img as any)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        logger.info('No face detected in the provided image');
        return null;
      }

      // Validate descriptor length
      if (detection.descriptor.length !== 128) {
        logger.error(`Invalid descriptor length: ${detection.descriptor.length} (expected 128)`);
        return null;
      }

      return detection.descriptor;
    } catch (error) {
      logger.error(`Error extracting face embedding: ${error}`);
      return null;
    }
  }

  compare(probe: Float32Array, gallery: { id: string; descriptor: number[] }[], threshold = 0.6) {
    if (!probe || probe.length !== 128) {
      logger.error(
        `Invalid probe descriptor: ${probe ? probe.length : 'null'} elements (expected 128)`,
      );
      return [];
    }

    const validGallery = gallery.filter((entry) => {
      if (!entry.descriptor || entry.descriptor.length !== 128) {
        logger.warn(
          `Invalid descriptor for gallery entry ${entry.id}: ${entry.descriptor ? entry.descriptor.length : 'null'} elements (expected 128)`,
        );
        return false;
      }
      return true;
    });

    try {
      return validGallery
        .map((entry) => {
          try {
            const galleryDescriptor = new Float32Array(entry.descriptor);
            const distance = faceapi.euclideanDistance(probe, galleryDescriptor);
            return {
              id: entry.id,
              distance: distance,
            };
          } catch (error) {
            logger.error(`Error comparing faces for entry ${entry.id}: ${error}`);
            return null;
          }
        })
        .filter(
          (match): match is { id: string; distance: number } =>
            match !== null && !isNaN(match.distance) && match.distance <= threshold,
        )
        .sort((a, b) => a.distance - b.distance);
    } catch (error) {
      logger.error(`Error in face comparison: ${error}`);
      return [];
    }
  }
}

export default new FaceService();
