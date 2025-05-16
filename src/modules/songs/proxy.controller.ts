import { Controller, Get, Param, Res, Query, Headers } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';

@Controller('proxy')
export class ProxyController {
  @Get('audio/:id')
  async proxyAudio(
    @Param('id') id: string,
    @Query('url') url: string,
    @Res() res: Response,
    @Headers() headers: any,
  ) {
    try {
      console.log(`Proxying audio request for ID: ${id}`);
      console.log(`Original URL: ${url}`);
      
      if (!url) {
        return res.status(400).send({ error: 'URL parameter is required' });
      }

      // Decode the URL if it's encoded
      let decodedUrl;
      try {
        decodedUrl = decodeURIComponent(url);
      } catch (e) {
        decodedUrl = url;
      }

      console.log(`Decoded URL: ${decodedUrl}`);

      // Stream the file from Google Storage to the client
      const response = await axios({
        method: 'GET',
        url: decodedUrl,
        responseType: 'stream',
        headers: {
          // Forward user-agent from the client
          'User-Agent': headers['user-agent'] || 'Proxy Service',
          // Add range support for seeking
          Range: headers.range || '',
        },
      });

      // Set appropriate headers
      res.set({
        'Content-Type': response.headers['content-type'] || 'audio/mpeg',
        'Content-Length': response.headers['content-length'],
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      });

      // If this was a range request, respond with 206 Partial Content
      if (headers.range && response.headers['content-range']) {
        res.status(206);
        res.set('Content-Range', response.headers['content-range']);
      } else {
        res.status(200);
      }

      // Send the file to the client
      response.data.pipe(res);
    } catch (error) {
      console.error('Audio proxy error:', error.message);
      
      // Send a more detailed error message
      return res.status(500).send({
        error: 'Failed to proxy audio',
        message: error.message,
        details: error.response?.data || 'No additional details',
      });
    }
  }
}
