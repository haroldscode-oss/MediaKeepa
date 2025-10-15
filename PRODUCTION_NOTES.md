# Production Deployment Guide

## When Ready to Finalize MediaKeepa

Once you're done coding and want to simplify to a single-port setup:

### Steps:
1. **Build the frontend:**
   ```bash
   cd spark-template
   npm run build
   ```

2. **Update server.py to serve the built frontend:**
   - Add route to serve React build files
   - Remove CORS (won't need it anymore)
   - Everything runs on port 8000

3. **Simplify startup:**
   - Only need to run `python server.py`
   - One port, one command
   - Much faster and simpler!

### Benefits:
- ✅ Single port (8000)
- ✅ One command to start
- ✅ Faster load times
- ✅ No development dependencies needed
- ✅ Production-ready

---

**For now:** Keep using `start-all-servers.bat` while developing! 🚀
