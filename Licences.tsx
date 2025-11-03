import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from './navigationTypes';
import type { RootStackParamList } from './navigationTypes';

const Licences: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleBack = () => {
    navigation.navigate('MainMenu');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Licenses</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mapillary Images</Text>
          <Text style={styles.licenseText}>
            Images provided via Mapillary, licensed under CC-BY-SA 4.0.{'\n'}
            For more details: https://www.mapillary.com/app/licenses
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OpenStreetMap Data</Text>
          <Text style={styles.licenseText}>
            Map data provided by OpenStreetMap, licensed under ODbL 1.0.{'\n'}
            For more details: https://www.openstreetmap.org/copyright
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fallback Map Data</Text>
          <Text style={styles.licenseText}>
            Fallback map data provided by:{'\n'}
            - BigDataCloud{'\n'}
            - Geocode.xyz{'\n'}
            - Geonames (CC-BY-SA 4.0){'\n'}
            For more details:{'\n'}
            https://www.bigdatacloud.com/terms{'\n'}
            https://geocode.xyz/terms{'\n'}
            http://creativecommons.org/licenses/by-sa/4.0/
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Models</Text>
          <Text style={styles.licenseText}>
            AI models used for AI 1v1 provided by OpenRouter:{'\n'}
            - Mistral-Small-3.2-24B-Instruct licensed under Apache-2.0{'\n'}
            For more details: https://www.apache.org/licenses/LICENSE-2.0{'\n'}
            {'\n'}
            - Llama-4-Scout: Llama 4 is licensed under the Llama 4 Community License, Copyright © Meta Platforms, Inc. All Rights Reserved.{'\n'}
            For more details: https://llama.meta.com/llama4/use-policy
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Libraries</Text>
          <Text style={styles.licenseText}>
            This app uses the following open-source libraries:{'\n'}
            - React Native: MIT License{'\n'}
            - React Navigation: MIT License{'\n'}
            - And others as per their package.json files.{'\n'}
            {'\n'}
            For full licenses, refer to <a href="https://github.com/oof2510/GeoguessApp/blob/main/package.json">package.json</a>.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 60, // Placeholder for alignment
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  licenseText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default Licences;
